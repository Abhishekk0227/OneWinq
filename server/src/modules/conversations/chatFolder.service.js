import mongoose from 'mongoose';
import { ChatFolder } from './chatFolder.model.js';
import { NotFoundError, ConflictError, AppError } from '../../shared/errors.js';
import { ERROR_CODE } from '../../config/constants.js';

export async function getUserFolders(userId) {
  const folders = await ChatFolder.find({ userId: new mongoose.Types.ObjectId(String(userId)) })
    .sort({ createdAt: 1 })
    .lean();

  return folders.map((f) => ({
    id: f._id.toString(),
    _id: f._id.toString(),
    name: f.name,
    color: f.color || 'purple',
    icon: f.icon || 'folder',
    memberUserIds: (f.memberUserIds || []).map((id) => id.toString()),
    memberCount: (f.memberUserIds || []).length,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));
}

export async function createFolder(userId, { name, color = 'purple', icon = 'folder', memberUserIds = [] }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    throw new AppError('Folder name is required', ERROR_CODE.VALIDATION_ERROR, 400);
  }

  const uId = new mongoose.Types.ObjectId(String(userId));

  const existing = await ChatFolder.findOne({
    userId: uId,
    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
  });

  if (existing) {
    throw new ConflictError(`Folder "${trimmedName}" already exists`);
  }

  const validMemberIds = (memberUserIds || [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(String(id)));

  const folder = await ChatFolder.create({
    userId: uId,
    name: trimmedName,
    color,
    icon,
    memberUserIds: validMemberIds,
  });

  return {
    id: folder._id.toString(),
    _id: folder._id.toString(),
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    memberUserIds: folder.memberUserIds.map((id) => id.toString()),
    memberCount: folder.memberUserIds.length,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

export async function updateFolder(userId, folderId, { name, color, icon, memberUserIds }) {
  const uId = new mongoose.Types.ObjectId(String(userId));
  const folder = await ChatFolder.findOne({ _id: folderId, userId: uId });

  if (!folder) {
    throw new NotFoundError('Folder not found');
  }

  if (name !== undefined) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      throw new AppError('Folder name cannot be empty', ERROR_CODE.VALIDATION_ERROR, 400);
    }
    const existing = await ChatFolder.findOne({
      _id: { $ne: folder._id },
      userId: uId,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });
    if (existing) {
      throw new ConflictError(`Folder "${trimmedName}" already exists`);
    }
    folder.name = trimmedName;
  }

  if (color !== undefined) {
    folder.color = color;
  }

  if (icon !== undefined) {
    folder.icon = icon;
  }

  if (Array.isArray(memberUserIds)) {
    folder.memberUserIds = memberUserIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(String(id)));
  }

  await folder.save();

  return {
    id: folder._id.toString(),
    _id: folder._id.toString(),
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    memberUserIds: folder.memberUserIds.map((id) => id.toString()),
    memberCount: folder.memberUserIds.length,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

export async function deleteFolder(userId, folderId) {
  const uId = new mongoose.Types.ObjectId(String(userId));
  const folder = await ChatFolder.findOneAndDelete({ _id: folderId, userId: uId });

  if (!folder) {
    throw new NotFoundError('Folder not found');
  }

  return { message: 'Folder deleted successfully' };
}

export async function toggleFolderMember(userId, folderId, memberUserId) {
  const uId = new mongoose.Types.ObjectId(String(userId));
  const memberIdStr = String(memberUserId);

  const folder = await ChatFolder.findOne({ _id: folderId, userId: uId });
  if (!folder) {
    throw new NotFoundError('Folder not found');
  }

  const existingIndex = folder.memberUserIds.findIndex((id) => id.toString() === memberIdStr);
  let isMember = false;

  if (existingIndex > -1) {
    folder.memberUserIds.splice(existingIndex, 1);
    isMember = false;
  } else {
    folder.memberUserIds.push(new mongoose.Types.ObjectId(memberIdStr));
    isMember = true;
  }

  await folder.save();

  return {
    folderId: folder._id.toString(),
    memberUserId: memberIdStr,
    isMember,
    memberCount: folder.memberUserIds.length,
  };
}

export async function setUserFolders(userId, targetUserId, folderIds = []) {
  const uId = new mongoose.Types.ObjectId(String(userId));
  const targetId = new mongoose.Types.ObjectId(String(targetUserId));
  const targetIdStr = targetId.toString();

  const userFolders = await ChatFolder.find({ userId: uId });
  const selectedFolderIdSet = new Set((folderIds || []).map(String));

  for (const folder of userFolders) {
    const fIdStr = folder._id.toString();
    const currentlyHas = folder.memberUserIds.some((id) => id.toString() === targetIdStr);
    const shouldHave = selectedFolderIdSet.has(fIdStr);

    if (shouldHave && !currentlyHas) {
      folder.memberUserIds.push(targetId);
      await folder.save();
    } else if (!shouldHave && currentlyHas) {
      folder.memberUserIds = folder.memberUserIds.filter((id) => id.toString() !== targetIdStr);
      await folder.save();
    }
  }

  return getUserFolders(userId);
}
