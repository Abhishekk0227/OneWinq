import { z } from 'zod';
import {
  REPORT_TARGET_TYPE,
  REPORT_REASON,
  REPORT_STATE,
  REPORT_ACTION,
} from '../../config/constants.js';

export const createReportSchema = z.object({
  targetType: z.enum([
    REPORT_TARGET_TYPE.PROFILE,
    REPORT_TARGET_TYPE.MESSAGE,
    REPORT_TARGET_TYPE.CARD,
  ]),
  targetId: z.string().min(1).max(100),
  reportedUser: z.string().optional(),
  reason: z.enum(Object.values(REPORT_REASON)),
  description: z.string().max(1000).optional().default(''),
  evidenceMedia: z.array(z.string()).optional().default([]),
});

export const resolveReportSchema = z.object({
  status: z.enum([REPORT_STATE.RESOLVED, REPORT_STATE.DISMISSED]),
  actionTaken: z.enum(Object.values(REPORT_ACTION)).optional().default(REPORT_ACTION.NONE),
  resolutionNotes: z.string().max(1000).optional().default(''),
});
