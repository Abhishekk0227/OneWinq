import { Job } from './job.model.js';
import { Application } from './application.model.js';
import { User } from '../users/user.model.js';
import { Profile } from '../profiles/profile.model.js';
import { Organization } from '../organizations/organization.model.js';
import {
  JOB_STATUS,
  APPLICATION_STATUS,
  ERROR_CODE,
} from '../../config/constants.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors.js';
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
export async function getJobById(jobId, incrementViews = true) {
  const job = await Job.findById(jobId)
    .populate('organizationId', 'name slug logoUrl website location isVerified type')
    .populate('departmentId', 'name code');

  if (!job) {
    throw new NotFoundError('Job posting not found', ERROR_CODE.JOB_NOT_FOUND);
  }

  if (incrementViews) {
    Job.findByIdAndUpdate(jobId, { $inc: { viewsCount: 1 } }).catch(() => {});
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
    status: job.status,
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
export async function listPublicJobs({
  page = 1,
  limit = 20,
  q,
  organizationId,
  employmentType,
  workplaceType,
  city,
  country,
}) {
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

  return {
    jobs: jobs.map((j) => {
      const org = j.organizationId || {};
      return {
        id: j._id.toString(),
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

  const applicantSnapshot = {
    displayName: applicantUser.displayName,
    username: applicantUser.username,
    email: applicantUser.email,
    avatarUrl: applicantUser.avatarUrl,
    headline: applicantProfile?.headline || '',
    bio: applicantProfile?.bio || '',
    skills: (applicantProfile?.skills || []).map((s) => (typeof s === 'string' ? s : s.name)),
    experience: applicantProfile?.experience || [],
    education: applicantProfile?.education || [],
  };

  const application = await Application.create({
    jobId,
    organizationId: job.organizationId,
    applicantId: applicantUserId,
    resumeUrl: applicationData.resumeUrl || null,
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
      return {
        id: a._id.toString(),
        jobId: job._id?.toString() || null,
        jobTitle: job.title || 'Unknown Position',
        applicant: {
          id: applicant._id?.toString() || null,
          displayName: applicant.displayName || a.applicantSnapshot?.displayName || 'Applicant',
          username: applicant.username || a.applicantSnapshot?.username || '',
          email: applicant.email || a.applicantSnapshot?.email || '',
          avatarUrl: applicant.avatarUrl || a.applicantSnapshot?.avatarUrl || null,
          headline: a.applicantSnapshot?.headline || '',
          skills: a.applicantSnapshot?.skills || [],
        },
        status: a.status,
        resumeUrl: a.resumeUrl,
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
