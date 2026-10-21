import { Job } from './job.model.js';
import { Application } from './application.model.js';
import { User } from '../users/user.model.js';
import { Profile } from '../profiles/profile.model.js';
import { Organization } from '../organizations/organization.model.js';
import {
  JOB_STATUS,
  APPLICATION_STATUS,
  NOTIFICATION_TYPE,
  ERROR_CODE,
} from '../../config/constants.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors.js';
import { notificationService } from '../notifications/notification.service.js';
import { emailService } from '../../infrastructure/email/emailService.js';
import logger from '../../utils/logger.js';

/**
 * Post a new job for an organization.
 */
export async function createJob(organizationId, creatorId, data) {
  const job = await Job.create({
    ...data,
    organizationId,
    creatorId,
  });

  await Organization.findByIdAndUpdate(organizationId, {
    $inc: { jobsCount: 1 },
  });

  logger.info(`[Job] Created job "${job.title}" for organization ${organizationId}`);

  return job.toSafeObject();
}

/**
 * Update an existing job.
 */
export async function updateJob(organizationId, jobId, updateData) {
  const job = await Job.findOne({ _id: jobId, organizationId });
  if (!job) {
    throw new NotFoundError('Job posting not found', ERROR_CODE.JOB_NOT_FOUND);
  }

  Object.assign(job, updateData);
  await job.save();

  return job.toSafeObject();
}

/**
 * Retrieve job details (public or tenant view). Increments view counter.
 */
export async function getJobById(jobId, currentUserIdOrIncrement = true, maybeUserId = null) {
  let incrementViews = true;
  let currentUserId = null;

  if (typeof currentUserIdOrIncrement === 'boolean') {
    incrementViews = currentUserIdOrIncrement;
    currentUserId = maybeUserId;
  } else if (typeof currentUserIdOrIncrement === 'string') {
    currentUserId = currentUserIdOrIncrement;
  }

  const job = await Job.findById(jobId)
    .populate('organizationId', 'name slug logoUrl website location isVerified type')
    .populate('departmentId', 'name code');

  if (!job) {
    throw new NotFoundError('Job posting not found', ERROR_CODE.JOB_NOT_FOUND);
  }

  if (incrementViews) {
    Job.findByIdAndUpdate(jobId, { $inc: { viewsCount: 1 } }).catch(() => {});
  }

  let hasApplied = false;
  let applicationStatus = null;
  if (currentUserId) {
    const userApp = await Application.findOne({
      applicantId: currentUserId,
      jobId,
    }).select('status').lean();

    if (userApp) {
      hasApplied = true;
      applicationStatus = userApp.status;
    }
  }

  return {
    id: job._id.toString(),
    title: job.title,
    organization: job.organizationId
      ? {
          id: job.organizationId._id.toString(),
          name: job.organizationId.name,
          slug: job.organizationId.slug,
          logoUrl: job.organizationId.logoUrl,
          website: job.organizationId.website,
          location: job.organizationId.location,
          isVerified: job.organizationId.isVerified,
          type: job.organizationId.type,
        }
      : null,
    department: job.departmentId
      ? { id: job.departmentId._id.toString(), name: job.departmentId.name, code: job.departmentId.code }
      : null,
    description: job.description,
    employmentType: job.employmentType,
    workplaceType: job.workplaceType,
    location: job.location,
    salary: job.salary,
    skills: job.skills,
    experienceLevel: job.experienceLevel,
    applicationMethod: job.applicationMethod || 'INTERNAL',
    externalApplyUrl: job.externalApplyUrl || null,
    status: job.status,
    hasApplied,
    applicationStatus,
    applicationsCount: job.applicationsCount,
    viewsCount: job.viewsCount,
    publishedAt: job.publishedAt,
    expiresAt: job.expiresAt,
    createdAt: job.createdAt,
  };
}

/**
 * List jobs for a specific organization (tenant dashboard view).
 */
export async function listOrganizationJobs(organizationId, { page = 1, limit = 20, status, departmentId }) {
  const filter = { organizationId };

  if (status) {
    filter.status = status;
  }
  if (departmentId) {
    filter.departmentId = departmentId;
  }

  const skip = (page - 1) * limit;

  const [total, jobs] = await Promise.all([
    Job.countDocuments(filter),
    Job.find(filter)
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    jobs: jobs.map((j) => ({
      id: j._id.toString(),
      title: j.title,
      department: j.departmentId
        ? { id: j.departmentId._id.toString(), name: j.departmentId.name, code: j.departmentId.code }
        : null,
      employmentType: j.employmentType,
      workplaceType: j.workplaceType,
      location: j.location,
      salary: j.salary,
      skills: j.skills,
      applicationMethod: j.applicationMethod || 'INTERNAL',
      externalApplyUrl: j.externalApplyUrl || null,
      status: j.status,
      applicationsCount: j.applicationsCount,
      viewsCount: j.viewsCount,
      publishedAt: j.publishedAt,
      createdAt: j.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Public search & discovery for job openings.
 */
export async function listPublicJobs(
  {
    page = 1,
    limit = 20,
    q,
    organizationId,
    employmentType,
    workplaceType,
    city,
    country,
  },
  currentUserId = null,
) {
  const filter = {
    status: JOB_STATUS.PUBLISHED,
  };

  if (organizationId) {
    filter.organizationId = organizationId;
  }
  if (employmentType) {
    filter.employmentType = employmentType;
  }
  if (workplaceType) {
    filter.workplaceType = workplaceType;
  }
  if (city) {
    filter['location.city'] = new RegExp(city, 'i');
  }
  if (country) {
    filter['location.country'] = new RegExp(country, 'i');
  }

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
      { skills: { $in: [new RegExp(escaped, 'i')] } },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, jobs] = await Promise.all([
    Job.countDocuments(filter),
    Job.find(filter)
      .populate('organizationId', 'name slug logoUrl location isVerified type')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const jobIds = jobs.map((j) => j._id);
  const appliedMap = {};
  if (currentUserId && jobIds.length > 0) {
    const userApplications = await Application.find({
      applicantId: currentUserId,
      jobId: { $in: jobIds },
    })
      .select('jobId status')
      .lean();

    for (const app of userApplications) {
      appliedMap[app.jobId.toString()] = app.status;
    }
  }

  return {
    jobs: jobs.map((j) => {
      const org = j.organizationId || {};
      const jobIdStr = j._id.toString();
      return {
        id: jobIdStr,
        title: j.title,
        organization: {
          id: org._id?.toString() || null,
          name: org.name || 'Company',
          slug: org.slug || '',
          logoUrl: org.logoUrl || null,
          location: org.location || {},
          isVerified: org.isVerified || false,
        },
        employmentType: j.employmentType,
        workplaceType: j.workplaceType,
        location: j.location,
        salary: j.salary,
        skills: j.skills,
        experienceLevel: j.experienceLevel,
        applicationMethod: j.applicationMethod || 'INTERNAL',
        externalApplyUrl: j.externalApplyUrl || null,
        hasApplied: !!appliedMap[jobIdStr],
        applicationStatus: appliedMap[jobIdStr] || null,
        publishedAt: j.publishedAt,
        createdAt: j.createdAt,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Delete a job posting.
 */
export async function deleteJob(organizationId, jobId) {
  const job = await Job.findOne({ _id: jobId, organizationId });
  if (!job) {
    throw new NotFoundError('Job posting not found');
  }

  await job.deleteOne();

  await Organization.findByIdAndUpdate(organizationId, {
    $inc: { jobsCount: -1 },
  });

  return { success: true };
}

/**
 * Candidate submits application for a job posting.
 */
export async function applyToJob(jobId, applicantUserId, applicationData) {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job posting not found', ERROR_CODE.JOB_NOT_FOUND);
  }

  if (job.status !== JOB_STATUS.PUBLISHED) {
    throw new ValidationError('This job is not currently accepting applications');
  }

  // Prevent duplicate application
  const existing = await Application.findOne({
    jobId,
    applicantId: applicantUserId,
  });

  if (existing) {
    throw new ConflictError(
      'You have already applied for this position',
      ERROR_CODE.APPLICATION_EXISTS,
    );
  }

  // Fetch applicant user and profile snapshot
  const [applicantUser, applicantProfile] = await Promise.all([
    User.findById(applicantUserId).select('displayName username email avatarUrl').lean(),
    Profile.findOne({ userId: applicantUserId, isActive: true }).lean(),
  ]);

  const profileSlug = applicantUser?.username || applicantUserId.toString();
  const shareProfile = applicationData.shareProfile !== false && Boolean(applicationData.oneWinqProfileUrl);
  const oneWinqProfileUrl = shareProfile
    ? (applicationData.oneWinqProfileUrl || `/u/${profileSlug}`)
    : null;

  const applicantSnapshot = {
    displayName: applicantUser?.displayName || '',
    username: shareProfile ? (applicantUser?.username || '') : '',
    email: applicantUser?.email || '',
    avatarUrl: shareProfile ? (applicantUser?.avatarUrl || null) : null,
    oneWinqProfileUrl,
    shareProfile,
    headline: shareProfile ? (applicantProfile?.headline || '') : '',
    bio: shareProfile ? (applicantProfile?.bio || '') : '',
    skills: shareProfile ? (applicantProfile?.skills || []).map((s) => (typeof s === 'string' ? s : s.name)) : [],
    experience: shareProfile ? (applicantProfile?.experience || []) : [],
    education: shareProfile ? (applicantProfile?.education || []) : [],
  };

  const application = await Application.create({
    jobId,
    organizationId: job.organizationId,
    applicantId: applicantUserId,
    resumeUrl: applicationData.resumeUrl || null,
    oneWinqProfileUrl,
    coverLetter: applicationData.coverLetter || '',
    applicantSnapshot,
    status: APPLICATION_STATUS.SUBMITTED,
  });

  await Job.findByIdAndUpdate(jobId, {
    $inc: { applicationsCount: 1 },
  });

  logger.info(`[Application] User ${applicantUserId} applied to job "${job.title}" (${job._id})`);

  return application.toSafeObject();
}

/**
 * List candidate applications for a specific job (HR/recruiter view).
 */
export async function listJobApplications(organizationId, jobId, { page = 1, limit = 20, status }) {
  const filter = {
    organizationId,
  };

  if (jobId) {
    filter.jobId = jobId;
  }
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [total, applications] = await Promise.all([
    Application.countDocuments(filter),
    Application.find(filter)
      .populate('jobId', 'title departmentId employmentType location')
      .populate('applicantId', 'displayName username email avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    applications: applications.map((a) => {
      const applicant = a.applicantId || {};
      const job = a.jobId || {};
      const isProfileShared = a.applicantSnapshot?.shareProfile !== false && Boolean(a.oneWinqProfileUrl || a.applicantSnapshot?.oneWinqProfileUrl);
      const resolvedProfileUrl = isProfileShared ? (a.oneWinqProfileUrl || a.applicantSnapshot?.oneWinqProfileUrl || null) : null;

      return {
        id: a._id.toString(),
        jobId: job._id?.toString() || null,
        jobTitle: job.title || 'Unknown Position',
        applicant: {
          id: applicant._id?.toString() || null,
          displayName: applicant.displayName || a.applicantSnapshot?.displayName || 'Applicant',
          username: isProfileShared ? (applicant.username || a.applicantSnapshot?.username || '') : '',
          email: applicant.email || a.applicantSnapshot?.email || '',
          avatarUrl: isProfileShared ? (applicant.avatarUrl || a.applicantSnapshot?.avatarUrl || null) : null,
          headline: a.applicantSnapshot?.headline || '',
          skills: a.applicantSnapshot?.skills || [],
          oneWinqProfileUrl: resolvedProfileUrl,
        },
        status: a.status,
        resumeUrl: a.resumeUrl,
        oneWinqProfileUrl: resolvedProfileUrl,
        coverLetter: a.coverLetter,
        internalNotesCount: (a.internalNotes || []).length,
        createdAt: a.createdAt,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update candidate application status (e.g. IN_REVIEW -> SHORTLISTED -> OFFERED).
 */
export async function updateApplicationStatus(organizationId, applicationId, memberUserId, status, comment = '') {
  const application = await Application.findOne({ _id: applicationId, organizationId });
  if (!application) {
    throw new NotFoundError('Application not found', ERROR_CODE.APPLICATION_NOT_FOUND);
  }

  application.status = status;
  application.statusHistory.push({
    status,
    changedBy: memberUserId,
    changedAt: new Date(),
    comment,
  });

  await application.save();

  logger.info(`[Application] Status updated for application ${applicationId} to ${status}`);

  // Notify candidate of status update via In-App Notification and Email
  try {
    const [org, job, applicantUser] = await Promise.all([
      Organization.findById(organizationId).select('name slug logoUrl').lean(),
      Job.findById(application.jobId).select('title').lean(),
      User.findById(application.applicantId).select('displayName email username').lean(),
    ]);

    const orgName = org?.name || 'The Employer';
    const jobTitle = job?.title || 'Position';
    const candidateName = applicantUser?.displayName || application.applicantSnapshot?.displayName || 'Applicant';
    const candidateEmail = applicantUser?.email || application.applicantSnapshot?.email;

    const readableStatusMap = {
      SUBMITTED: 'Application Submitted',
      IN_REVIEW: 'Under Review / Screening',
      SHORTLISTED: 'Shortlisted',
      INTERVIEW_SCHEDULED: 'Interview Scheduled',
      OFFERED: 'Job Offer Extended',
      HIRED: 'Hired',
      REJECTED: 'Application Not Selected',
      WITHDRAWN: 'Application Withdrawn',
    };
    const readableStatus = readableStatusMap[status] || status.replace('_', ' ');

    // 1. In-App Notification (Stored in DB + Socket.IO real-time delivery)
    await notificationService.createNotification({
      recipientId: application.applicantId,
      actorId: memberUserId,
      type: NOTIFICATION_TYPE.APPLICATION_STATUS_UPDATE,
      title: `Application Update: ${jobTitle}`,
      body: `${orgName} updated your application status to ${readableStatus}.${comment ? ` Recruiter remark: "${comment}"` : ''}`,
      entityType: 'application',
      entityId: application._id,
      linkUrl: '/app/my-applications',
      metadata: {
        organizationId: organizationId.toString(),
        orgName,
        jobId: application.jobId.toString(),
        jobTitle,
        newStatus: status,
        readableStatus,
        comment,
      },
    });

    // 2. Email Notification to Candidate
    if (candidateEmail) {
      const statusColors = {
        SHORTLISTED: '#6366f1',
        INTERVIEW_SCHEDULED: '#f59e0b',
        OFFERED: '#2563eb',
        HIRED: '#10b981',
        REJECTED: '#e11d48',
        IN_REVIEW: '#8b5cf6',
      };
      const badgeColor = statusColors[status] || '#4f46e5';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { background: #ffffff; border-radius: 16px; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 13px; color: #ffffff; background-color: ${badgeColor}; }
            .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-weight: 600; text-decoration: none; margin-top: 20px; }
            .footer { font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="margin-top: 0; color: #0f172a;">Application Update: ${jobTitle}</h2>
            <p>Hi ${candidateName},</p>
            <p><strong>${orgName}</strong> has updated the status of your application for the <strong>${jobTitle}</strong> position.</p>
            <div style="margin: 20px 0;">
              <span style="font-size: 12px; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 6px; font-weight: 600;">Current Stage</span>
              <span class="badge">${readableStatus}</span>
            </div>
            ${comment ? `<div style="background: #f1f5f9; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 14px; color: #334155; font-style: italic;">"${comment}"</div>` : ''}
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">You can view the latest progress, schedule interviews, and manage all your submissions on your OneWinq candidate dashboard.</p>
            <a href="https://onewinq.com/app/my-applications" class="btn">View My Applications</a>
            <div class="footer">
              <p>Sent by OneWinq Verified Careers on behalf of ${orgName}.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendNotificationEmail({
        to: candidateEmail,
        subject: `[${orgName}] Your application status has been updated to ${readableStatus}`,
        text: `Hi ${candidateName},\n\n${orgName} has updated the status of your application for ${jobTitle} to: ${readableStatus}.${comment ? `\n\nRecruiter remark: "${comment}"` : ''}\n\nTrack your application at: https://onewinq.com/app/my-applications\n\nBest regards,\n${orgName} Hiring Team`,
        html: emailHtml,
      }).catch((emailErr) => {
        logger.warn('[Application] Failed to send status update email to candidate', {
          candidateEmail,
          error: emailErr.message,
        });
      });
    }
  } catch (notifyErr) {
    logger.warn('[Application] Failed to dispatch notifications for application status update', {
      applicationId,
      error: notifyErr.message,
    });
  }

  return application.toSafeObject();
}

/**
 * Add an internal note to an application.
 */
export async function addApplicationNote(organizationId, applicationId, authorMemberId, note) {
  const application = await Application.findOne({ _id: applicationId, organizationId });
  if (!application) {
    throw new NotFoundError('Application not found', ERROR_CODE.APPLICATION_NOT_FOUND);
  }

  application.internalNotes.push({
    authorMemberId,
    note,
  });

  await application.save();

  return application.toSafeObject();
}

/**
 * List applications submitted by current Individual user (Candidate view).
 */
export async function getUserApplications(applicantUserId, { page = 1, limit = 20 }) {
  const filter = { applicantId: applicantUserId };
  const skip = (page - 1) * limit;

  const [total, applications] = await Promise.all([
    Application.countDocuments(filter),
    Application.find(filter)
      .populate({
        path: 'jobId',
        select: 'title workplaceType employmentType location organizationId',
        populate: { path: 'organizationId', select: 'name slug logoUrl' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    applications: applications.map((a) => {
      const job = a.jobId || {};
      const org = job.organizationId || {};
      return {
        id: a._id.toString(),
        jobId: job._id?.toString() || null,
        jobTitle: job.title || 'Position',
        organization: {
          id: org._id?.toString() || null,
          name: org.name || 'Company',
          slug: org.slug || '',
          logoUrl: org.logoUrl || null,
        },
        workplaceType: job.workplaceType,
        employmentType: job.employmentType,
        location: job.location,
        status: a.status,
        resumeUrl: a.resumeUrl,
        oneWinqProfileUrl: a.oneWinqProfileUrl || a.applicantSnapshot?.oneWinqProfileUrl || null,
        createdAt: a.createdAt,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
