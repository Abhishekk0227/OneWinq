import { OrganizationAuditLog } from './organizationAuditLog.model.js';
import logger from '../../utils/logger.js';

export async function recordOrgAudit(
  organizationId,
  actorUserId,
  { action, targetType, targetId, details = {}, ipAddress = '', userAgent = '' },
) {
  try {
    const log = await OrganizationAuditLog.create({
      organizationId,
      actorUserId,
      action,
      targetType,
      targetId,
      details,
      ipAddress,
      userAgent,
    });
    return log;
  } catch (err) {
    logger.error('[OrgAudit] Failed creating audit log record', {
      error: err.message,
      organizationId,
      action,
    });
    return null;
  }
}

export async function listOrgAuditLogs(organizationId, { page = 1, limit = 50 }) {
  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    OrganizationAuditLog.countDocuments({ organizationId }),
    OrganizationAuditLog.find({ organizationId })
      .populate('actorUserId', 'displayName username email avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l._id.toString(),
      actor: l.actorUserId
        ? {
            id: l.actorUserId._id?.toString() || null,
            displayName: l.actorUserId.displayName || 'User',
            username: l.actorUserId.username || '',
            email: l.actorUserId.email || '',
            avatarUrl: l.actorUserId.avatarUrl || null,
          }
        : null,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
