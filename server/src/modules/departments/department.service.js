import mongoose from 'mongoose';
import { Department } from './department.model.js';
import { OrganizationMember } from '../organizations/organizationMember.model.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';

export async function createDepartment(organizationId, data) {
  const existing = await Department.findOne({
    organizationId,
    name: new RegExp(`^${data.name.trim()}$`, 'i'),
  });

  if (existing) {
    throw new ConflictError('A department with this name already exists in this organization');
  }

  const department = await Department.create({
    ...data,
    organizationId,
  });

  return department.toSafeObject();
}

export async function listDepartments(organizationId) {
  const [departments, memberCounts] = await Promise.all([
    Department.find({ organizationId })
      .populate('leadMemberId', 'userId jobTitle')
      .sort({ name: 1 })
      .lean(),
    OrganizationMember.aggregate([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          status: 'ACTIVE',
          departmentId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$departmentId',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const countMap = new Map(memberCounts.map((c) => [c._id.toString(), c.count]));

  return departments.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    code: d.code,
    description: d.description,
    parentDepartmentId: d.parentDepartmentId?.toString() || null,
    leadMemberId: d.leadMemberId?._id?.toString() || null,
    membersCount: countMap.get(d._id.toString()) || 0,
    createdAt: d.createdAt,
  }));
}

export async function getDepartmentById(organizationId, departmentId) {
  const department = await Department.findOne({ _id: departmentId, organizationId });
  if (!department) {
    throw new NotFoundError('Department not found');
  }
  return department.toSafeObject();
}

export async function updateDepartment(organizationId, departmentId, data) {
  const department = await Department.findOne({ _id: departmentId, organizationId });
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  if (data.name && data.name.trim().toLowerCase() !== department.name.toLowerCase()) {
    const existing = await Department.findOne({
      organizationId,
      name: new RegExp(`^${data.name.trim()}$`, 'i'),
      _id: { $ne: departmentId },
    });
    if (existing) {
      throw new ConflictError('A department with this name already exists in this organization');
    }
  }

  Object.assign(department, data);
  await department.save();
  return department.toSafeObject();
}

export async function deleteDepartment(organizationId, departmentId) {
  const department = await Department.findOne({ _id: departmentId, organizationId });
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  // Clear department references on members
  await OrganizationMember.updateMany(
    { organizationId, departmentId },
    { $set: { departmentId: null } },
  );

  await department.deleteOne();
  return { success: true };
}
