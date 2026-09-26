import { describe, it, expect } from 'vitest';
import {
  timeRangeQuerySchema,
  trackLinkClickSchema,
  validate,
} from '../../../src/modules/analytics/analytics.validation.js';
import { parseDevice } from '../../../src/modules/analytics/analytics.service.js';

describe('Analytics Validation & Device Parser', () => {
  it('validates timeRangeQuerySchema with defaults and allowed periods', () => {
    const empty = validate(timeRangeQuerySchema, {});
    expect(empty.period).toBe('30d');

    const valid7d = validate(timeRangeQuerySchema, { period: '7d' });
    expect(valid7d.period).toBe('7d');

    const valid1y = validate(timeRangeQuerySchema, { period: '1y' });
    expect(valid1y.period).toBe('1y');

    expect(() => validate(timeRangeQuerySchema, { period: '50d' })).toThrow();
  });

  it('validates trackLinkClickSchema', () => {
    const valid = validate(trackLinkClickSchema, {
      targetUserId: '60c72b2f9b1d8b2bad000001',
      linkUrl: 'https://github.com/my-portfolio',
      label: 'GitHub',
    });

    expect(valid.targetUserId).toBe('60c72b2f9b1d8b2bad000001');
    expect(valid.linkUrl).toBe('https://github.com/my-portfolio');
    expect(valid.label).toBe('GitHub');

    expect(() =>
      validate(trackLinkClickSchema, {
        targetUserId: 'invalid-id',
        linkUrl: 'not-a-url',
      }),
    ).toThrow();
  });

  it('parses mobile, tablet, and desktop devices correctly from User-Agent', () => {
    // iPhone
    const iphoneUa =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
    const iphone = parseDevice(iphoneUa);
    expect(iphone.deviceType).toBe('mobile');
    expect(iphone.os).toBe('iOS');
    expect(iphone.browser).toBe('Safari');

    // Android tablet
    const tabletUa =
      'Mozilla/5.0 (Linux; Android 12; SM-X906C Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';
    const tablet = parseDevice(tabletUa);
    expect(tablet.deviceType).toBe('tablet');
    expect(tablet.os).toBe('Android');
    expect(tablet.browser).toBe('Chrome');

    // Windows Desktop Edge
    const winUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188';
    const win = parseDevice(winUa);
    expect(win.deviceType).toBe('desktop');
    expect(win.os).toBe('Windows');
    expect(win.browser).toBe('Edge');
  });
});
