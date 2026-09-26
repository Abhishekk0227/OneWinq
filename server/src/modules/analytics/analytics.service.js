import mongoose from 'mongoose';
import { RawEvent } from './rawEvent.model.js';
import { ProfileAnalytics } from './profileAnalytics.model.js';
import { CardAnalytics } from './cardAnalytics.model.js';
import { Card } from '../cards/card.model.js';
import { NotFoundError } from '../../shared/errors.js';
import logger from '../../utils/logger.js';

export function parseDevice(userAgent = '') {
  const ua = String(userAgent || '').toLowerCase();

  let deviceType = 'desktop';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) {
    deviceType = 'tablet';
  }

  let os = 'Other';
  if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/mac os|macintosh/i.test(ua)) {
    os = 'macOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  let browser = 'Other';
  if (/edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/i.test(ua)) {
    browser = 'Safari';
  }

  return { deviceType, os, browser };
}

function getPeriodStartDate(period = '30d') {
  const now = new Date();
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);

  switch (period) {
    case '7d':
      date.setUTCDate(date.getUTCDate() - 7);
      break;
    case '90d':
      date.setUTCDate(date.getUTCDate() - 90);
      break;
    case '1y':
      date.setUTCFullYear(date.getUTCFullYear() - 1);
      break;
    case '30d':
    default:
      date.setUTCDate(date.getUTCDate() - 30);
      break;
  }

  return date;
}

export const analyticsService = {
  /**
   * Record raw event and update daily aggregate buckets.
   */
  async recordEvent({
    eventType,
    targetUserId,
    actorUserId = null,
    cardUid = null,
    ip = null,
    userAgent = null,
    metadata = {},
  }) {
    try {
      const device = parseDevice(userAgent);

      // 1. Record raw event
      await RawEvent.create({
        eventType,
        targetUserId,
        actorUserId,
        cardUid: cardUid ? cardUid.toUpperCase() : null,
        ip,
        userAgent,
        device,
        metadata,
      });

      // 2. Aggregate into daily bucket
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      if (eventType === 'profile.viewed') {
        await ProfileAnalytics.updateOne(
          { userId: targetUserId, date: today },
          { $inc: { viewsCount: 1 } },
          { upsert: true },
        );
      } else if (eventType === 'card.tapped' && cardUid) {
        await CardAnalytics.updateOne(
          { cardUid: cardUid.toUpperCase(), userId: targetUserId, date: today },
          { $inc: { tapCount: 1 } },
          { upsert: true },
        );
      } else if (eventType === 'qr.scanned' && cardUid) {
        await CardAnalytics.updateOne(
          { cardUid: cardUid.toUpperCase(), userId: targetUserId, date: today },
          { $inc: { scanCount: 1 } },
          { upsert: true },
        );
      } else if (eventType === 'connection.request_sent') {
        await ProfileAnalytics.updateOne(
          { userId: targetUserId, date: today },
          { $inc: { connectionsRequested: 1 } },
          { upsert: true },
        );
      } else if (eventType === 'connection.accepted') {
        await ProfileAnalytics.updateOne(
          { userId: targetUserId, date: today },
          { $inc: { connectionsAccepted: 1 } },
          { upsert: true },
        );
      }
    } catch (err) {
      logger.error('Failed to record analytics event', {
        eventType,
        targetUserId,
        error: err.message,
      });
    }
  },

  /**
   * Get overview metrics and timeline across profiles and cards.
   */
  async getOverview(userId, { period = '30d' } = {}) {
    const sinceDate = getPeriodStartDate(period);
    const userObjId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const [profileMetrics, cardMetrics, userCards, linkClicksCount, rawViewStats, uniqueViewersAgg] =
      await Promise.all([
        ProfileAnalytics.find({ userId, date: { $gte: sinceDate } }).sort({ date: 1 }).lean(),
        CardAnalytics.find({ userId, date: { $gte: sinceDate } }).sort({ date: 1 }).lean(),
        Card.find({
          $or: [
            { assignedUser: userId },
            { userId: userId },
            { assignedTo: userId },
          ],
        }).select('tapCount qrScanCount').lean(),
        RawEvent.countDocuments({
          targetUserId: userObjId,
          eventType: 'link.clicked',
          timestamp: { $gte: sinceDate },
        }),
        RawEvent.aggregate([
          {
            $match: {
              targetUserId: userObjId,
              eventType: 'profile.viewed',
              timestamp: { $gte: sinceDate },
            },
          },
          {
            $group: {
              _id: null,
              totalViews: { $sum: 1 },
              identifiableViews: {
                $sum: { $cond: [{ $ne: ['$actorUserId', null] }, 1, 0] },
              },
              anonymousViews: {
                $sum: { $cond: [{ $eq: ['$actorUserId', null] }, 1, 0] },
              },
            },
          },
        ]),
        RawEvent.aggregate([
          {
            $match: {
              targetUserId: userObjId,
              eventType: 'profile.viewed',
              timestamp: { $gte: sinceDate },
            },
          },
          {
            $group: {
              _id: {
                $cond: [
                  { $ne: ['$actorUserId', null] },
                  { $concat: ['user:', { $toString: '$actorUserId' }] },
                  { $concat: ['ip:', { $ifNull: ['$ip', 'unknown'] }] },
                ],
              },
            },
          },
          { $count: 'count' },
        ]),
      ]);

    // Compute views count
    let bucketViews = 0;
    let connectionsRequested = 0;
    let connectionsAccepted = 0;

    profileMetrics.forEach((m) => {
      bucketViews += m.viewsCount || 0;
      connectionsRequested += m.connectionsRequested || 0;
      connectionsAccepted += m.connectionsAccepted || 0;
    });

    const rawViews = rawViewStats[0]?.totalViews || 0;
    const totalProfileViews = Math.max(bucketViews, rawViews);

    const rawIdentifiable = rawViewStats[0]?.identifiableViews || 0;
    const identifiableViews = rawIdentifiable;
    const anonymousViews = Math.max(0, totalProfileViews - identifiableViews);

    const uniqueViewers = uniqueViewersAgg[0]?.count || (totalProfileViews > 0 ? 1 : 0);

    // Compute taps and scans
    let periodTaps = 0;
    let periodScans = 0;
    cardMetrics.forEach((m) => {
      periodTaps += m.tapCount || 0;
      periodScans += m.scanCount || 0;
    });

    let cardLifetimeTaps = 0;
    let cardLifetimeScans = 0;
    userCards.forEach((c) => {
      cardLifetimeTaps += c.tapCount || 0;
      cardLifetimeScans += c.qrScanCount || 0;
    });

    const nfcTaps = Math.max(periodTaps, cardLifetimeTaps);
    const qrScans = Math.max(periodScans, cardLifetimeScans);
    const linkClicks = linkClicksCount || 0;

    const totalInteractions = totalProfileViews + nfcTaps + qrScans;
    const conversionRate =
      totalInteractions > 0
        ? Number(((connectionsAccepted / totalInteractions) * 100).toFixed(1))
        : 0;

    // Build continuous timeline day-by-day map
    const profileMap = new Map();
    profileMetrics.forEach((p) => {
      const d = p.date.toISOString().split('T')[0];
      profileMap.set(d, p.viewsCount || 0);
    });

    const cardTapsMap = new Map();
    const cardScansMap = new Map();
    cardMetrics.forEach((c) => {
      const d = c.date.toISOString().split('T')[0];
      cardTapsMap.set(d, c.tapCount || 0);
      cardScansMap.set(d, c.scanCount || 0);
    });

    const timeSeries = [];
    const endDate = new Date();
    const cur = new Date(sinceDate);
    while (cur <= endDate) {
      const dStr = cur.toISOString().split('T')[0];
      timeSeries.push({
        date: dStr,
        views: profileMap.get(dStr) || 0,
        nfcTaps: cardTapsMap.get(dStr) || 0,
        qrScans: cardScansMap.get(dStr) || 0,
        clicks: 0,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const overview = {
      totalProfileViews,
      uniqueViewers,
      identifiableViews,
      anonymousViews,
      qrScans,
      nfcTaps,
      linkClicks,
    };

    const summary = {
      totalViews: totalProfileViews,
      totalTaps: nfcTaps,
      totalScans: qrScans,
      connectionsRequested,
      connectionsAccepted,
      conversionRate,
    };

    return {
      period,
      overview,
      summary,
      timeSeries,
      profileTimeline: timeSeries.map((t) => ({ date: t.date, views: t.views })),
      cardTimeline: timeSeries.map((t) => ({ date: t.date, taps: t.nfcTaps, scans: t.qrScans })),
    };
  },

  /**
   * Get deep dive profile traffic and device distribution.
   */
  async getProfileAnalytics(userId, { period = '30d' } = {}) {
    const sinceDate = getPeriodStartDate(period);
    const userObjId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const [overviewData, deviceStats, topLinksAgg, referrersAgg] = await Promise.all([
      this.getOverview(userId, { period }),
      RawEvent.aggregate([
        {
          $match: {
            targetUserId: userObjId,
            eventType: 'profile.viewed',
            timestamp: { $gte: sinceDate },
          },
        },
        {
          $group: {
            _id: '$device.deviceType',
            count: { $sum: 1 },
          },
        },
      ]),
      RawEvent.aggregate([
        {
          $match: {
            targetUserId: userObjId,
            eventType: 'link.clicked',
            timestamp: { $gte: sinceDate },
          },
        },
        {
          $group: {
            _id: {
              url: '$metadata.linkUrl',
              label: '$metadata.label',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      RawEvent.aggregate([
        {
          $match: {
            targetUserId: userObjId,
            eventType: 'profile.viewed',
            timestamp: { $gte: sinceDate },
            'metadata.referrer': { $exists: true, $ne: '' },
          },
        },
        {
          $group: {
            _id: '$metadata.referrer',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const deviceBreakdown = {
      mobile: 0,
      desktop: 0,
      tablet: 0,
    };
    deviceStats.forEach((d) => {
      if (d._id && deviceBreakdown[d._id] !== undefined) {
        deviceBreakdown[d._id] = d.count;
      }
    });

    const topLinks = topLinksAgg.map((item) => ({
      url: item._id.url || '',
      label: item._id.label || item._id.url || 'Link',
      count: item.count,
    }));

    const topReferrers = referrersAgg.map((item) => ({
      referrer: item._id,
      count: item.count,
    }));

    const analytics = {
      overview: overviewData.overview,
      timeSeries: overviewData.timeSeries,
      topReferrers,
      topLinks,
      viewerBreakdown: {
        publicViews: overviewData.overview.anonymousViews,
        professionalViews: overviewData.overview.identifiableViews,
        privateViews: 0,
      },
      deviceBreakdown,
    };

    return {
      period,
      analytics,
      overview: overviewData.overview,
      summary: overviewData.summary,
      timeSeries: overviewData.timeSeries,
      timeline: overviewData.profileTimeline,
      topLinks,
      topReferrers,
      deviceBreakdown,
    };
  },


  /**
   * Get analytics for a specific card owned by user.
   */
  async getCardAnalytics(userId, cardUid, { period = '30d' } = {}) {
    const card = await Card.findOne({
      cardUid: cardUid.toUpperCase(),
      assignedUser: userId,
    });

    if (!card) {
      throw new NotFoundError('Card not found or does not belong to your account');
    }

    const sinceDate = getPeriodStartDate(period);

    const metrics = await CardAnalytics.find({
      cardUid: card.cardUid,
      userId,
      date: { $gte: sinceDate },
    })
      .sort({ date: 1 })
      .lean();

    let totalTaps = 0;
    let totalScans = 0;

    metrics.forEach((m) => {
      totalTaps += m.tapCount || 0;
      totalScans += m.scanCount || 0;
    });

    return {
      cardUid: card.cardUid,
      period,
      summary: {
        totalTaps,
        totalScans,
        allTimeTaps: card.tapCount,
        allTimeScans: card.qrScanCount,
      },
      timeline: metrics.map((m) => ({
        date: m.date.toISOString().split('T')[0],
        taps: m.tapCount,
        scans: m.scanCount,
      })),
    };
  },
};
