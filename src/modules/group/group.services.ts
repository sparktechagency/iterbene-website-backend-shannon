import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { IGroup, GroupPrivacy } from './group.interface';
import Group from './group.model';
import { User } from '../user/user.model';
import { Connections } from '../connections/connections.model';
import { ConnectionStatus } from '../connections/connections.interface';
import { BlockedUser } from '../blockedUsers/blockedUsers.model';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import mongoose from 'mongoose';
import { validateUsers } from '../../utils/validateUsers';

interface CreateGroupPayload {
  name: string;
  description?: string;
  groupImage?: string;
  privacy: GroupPrivacy;
  location?: { latitude: number; longitude: number };
  locationName?: string;
  coLeaders?: string[];
  members?: string[];
}

const createGroup = async (
  creatorId: string,
  payload: CreateGroupPayload
): Promise<IGroup> => {
  // Validate creator exists
  const user = await User.findById(creatorId);
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Creator not found');
  }

  // Validate required fields
  if (!payload.name?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Group name is required');
  }
  if (!payload.location || !payload.locationName?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Location is required');
  }

  const coLeaders = payload.coLeaders || [];
  const members = payload.members || [];

  // Remove creator from co-leaders and members (creator is automatically admin)
  const validCoLeaders = coLeaders.filter(id => id !== creatorId);
  const validMembers = members.filter(
    id => id !== creatorId && !validCoLeaders.includes(id)
  );

  // Get all unique user IDs to validate
  const allUserIds = [...new Set([...validCoLeaders, ...validMembers])];

  // Validate all users exist in a single query (better performance)
  if (allUserIds.length > 0) {
    const existingUsers = await User.find({
      _id: { $in: allUserIds },
      isDeleted: { $ne: true },
    }).select('_id');

    const existingUserIds = existingUsers.map(user => user._id.toString());
    const invalidUsers = allUserIds.filter(id => !existingUserIds.includes(id));

    if (invalidUsers.length > 0) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Users not found: ${invalidUsers.join(', ')}`
      );
    }

    // Validate connections (if this validation is needed)
    for (const userId of allUserIds) {
      await validateUsers(creatorId, userId, 'Add to group');
    }
  }

  // Convert all IDs to ObjectId consistently
  const creatorObjectId = new mongoose.Types.ObjectId(creatorId);
  const coLeaderObjectIds = validCoLeaders.map(
    id => new mongoose.Types.ObjectId(id)
  );
  const memberObjectIds = validMembers.map(
    id => new mongoose.Types.ObjectId(id)
  );

  // Calculate total participants: creator + coLeaders + members
  const totalParticipants = 1 + validCoLeaders.length + validMembers.length;

  const group = new Group({
    creatorId: creatorObjectId,
    name: payload.name.trim(),
    description: payload.description?.trim() || '',
    groupImage: payload.groupImage || null,
    privacy: payload.privacy,
    location: payload.location,
    locationName: payload.locationName.trim(),
    admins: [creatorObjectId], // Creator is admin
    coLeaders: coLeaderObjectIds,
    members: [
      creatorObjectId, // Creator is also a member
      ...coLeaderObjectIds, // Co-leaders are also members
      ...memberObjectIds, // Regular members
    ],
    participantCount: totalParticipants,
  });

  await group.save();
  return group;
};

const joinGroup = async (userId: string, groupId: string): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  await validateUsers(userId, group.creatorId.toString(), 'Join group');

  if (group.members.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You are already a member');
  }

  if (group.privacy === GroupPrivacy.PUBLIC) {
    group.members.push(new mongoose.Types.ObjectId(userId));
    group.participantCount += 1;
  } else {
    if (group.pendingMembers.includes(new mongoose.Types.ObjectId(userId))) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Join request already pending'
      );
    }
    group.pendingMembers.push(new mongoose.Types.ObjectId(userId));
  }

  await group.save();
  return group;
};

const leaveGroup = async (userId: string, groupId: string): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (group.creatorId.toString() === userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Creator cannot leave group');
  }

  if (!group.members.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You are not a member');
  }

  group.members = group.members.filter(id => id.toString() !== userId);
  group.admins = group.admins.filter(id => id.toString() !== userId);
  group.coLeaders = group.coLeaders.filter(id => id.toString() !== userId);
  group.participantCount -= 1;

  await group.save();
  return group;
};

const approveJoinRequest = async (
  adminId: string,
  groupId: string,
  userId: string
): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (!group.admins.includes(new mongoose.Types.ObjectId(adminId))) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only admins can approve requests'
    );
  }

  if (!group.pendingMembers.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No pending request for this user'
    );
  }

  group.pendingMembers = group.pendingMembers.filter(
    id => id.toString() !== userId
  );
  group.members.push(new mongoose.Types.ObjectId(userId));
  group.participantCount += 1;

  await group.save();
  return group;
};

const rejectJoinRequest = async (
  adminId: string,
  groupId: string,
  userId: string
): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (!group.admins.includes(new mongoose.Types.ObjectId(adminId))) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only admins can reject requests'
    );
  }

  if (!group.pendingMembers.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No pending request for this user'
    );
  }

  group.pendingMembers = group.pendingMembers.filter(
    id => id.toString() !== userId
  );

  await group.save();
  return group;
};

const removeMember = async (
  adminId: string,
  groupId: string,
  userId: string
): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (!group.admins.includes(new mongoose.Types.ObjectId(adminId))) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can remove members');
  }

  if (group.creatorId.toString() === userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot remove the creator');
  }

  if (!group.members.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a member');
  }

  group.members = group.members.filter(id => id.toString() !== userId);
  group.admins = group.admins.filter(id => id.toString() !== userId);
  group.coLeaders = group.coLeaders.filter(id => id.toString() !== userId);
  group.participantCount -= 1;

  await group.save();
  return group;
};

const promoteToAdmin = async (
  adminId: string,
  groupId: string,
  userId: string
): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (!group.admins.includes(new mongoose.Types.ObjectId(adminId))) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only admins can promote members'
    );
  }

  if (!group.members.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a member');
  }

  if (group.admins.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is already an admin');
  }

  group.admins.push(new mongoose.Types.ObjectId(userId));
  group.coLeaders = group.coLeaders.filter(id => id.toString() !== userId);

  await group.save();
  return group;
};

const demoteAdmin = async (
  adminId: string,
  groupId: string,
  userId: string
): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (group.creatorId.toString() !== adminId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the creator can demote admins'
    );
  }

  if (group.creatorId.toString() === userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot demote the creator');
  }

  if (!group.admins.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not an admin');
  }

  group.admins = group.admins.filter(id => id.toString() !== userId);

  await group.save();
  return group;
};

const promoteToCoLeader = async (
  adminId: string,
  groupId: string,
  userId: string
): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (!group.admins.includes(new mongoose.Types.ObjectId(adminId))) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only admins can promote members'
    );
  }

  if (!group.members.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a member');
  }

  if (group.coLeaders.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is already a co-leader');
  }

  group.coLeaders.push(new mongoose.Types.ObjectId(userId));
  group.admins = group.admins.filter(id => id.toString() !== userId);

  await group.save();
  return group;
};

const demoteCoLeader = async (
  adminId: string,
  groupId: string,
  userId: string
): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (!group.admins.includes(new mongoose.Types.ObjectId(adminId))) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only admins can demote co-leaders'
    );
  }

  if (!group.coLeaders.includes(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a co-leader');
  }

  group.coLeaders = group.coLeaders.filter(id => id.toString() !== userId);

  await group.save();
  return group;
};
const getGroup = async (
  userId: string,
  groupId: string
): Promise<Partial<IGroup>> => {
  const group = await Group.findById(groupId).populate([
    {
      path: 'creatorId',
      select: 'fullName  profileImage username createdAt description',
    },
    {
      path: 'admins',
      select: 'fullName  profileImage username',
    },
    {
      path: 'coLeaders',
      select: 'fullName  profileImage username',
    },
    {
      path: 'members',
      select: 'fullName  profileImage username',
    },
    {
      path: 'pendingMembers',
      select: 'fullName  profileImage username',
    },
  ]);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }
  const isBlocked = await BlockedUser.findOne({
    $or: [
      { blockerId: group.creatorId, blockedId: userId },
      { blockerId: userId, blockedId: group.creatorId },
    ],
  });

  if (isBlocked) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot view this group');
  }
  return group;
};

const updateGroup = async (
  adminId: string,
  groupId: string,
  payload: Partial<IGroup>
): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (!group.admins.includes(new mongoose.Types.ObjectId(adminId))) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can update group');
  }

  const updatableFields = [
    'name',
    'description',
    'groupImage',
    'privacy',
    'location',
    'locationName',
  ];
  for (const [key, value] of Object.entries(payload)) {
    if (updatableFields.includes(key)) {
      (group as any)[key] = value;
    }
  }

  await group.save();
  return group;
};

const deleteGroup = async (
  creatorId: string,
  groupId: string
): Promise<IGroup> => {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  if (group.creatorId.toString() !== creatorId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the creator can delete the group'
    );
  }

  group.isDeleted = true;
  await group.save();
  return group;
};

const getMyGroups = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IGroup>> => {
  const query: Record<string, any> = {
    isDeleted: false,
    $or: [{ creatorId: userId }],
  };

  if (filters.privacy) {
    query.privacy = filters.privacy;
  }
  options.select =
    'name groupImage privacy participantCount createdAt updatedAt';
  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = -1;

  const groups = await Group.paginate(query, options);
  return groups;
};

const getMyJoinGroups = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IGroup>> => {
  // Ensure userId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId');
  }

  const query: Record<string, any> = {
    isDeleted: false,
    creatorId: { $ne: userId },
    $or: [{ members: { $in: [userId] } }, { coLeaders: { $in: [userId] } }],
  };

  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = -1;
  options.select =
    'name  groupImage privacy participantCount  createdAt updatedAt';
  const groups = await Group.paginate(query, options);
  return groups;
};

const getGroupSuggestions = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
) => {
  const user = await User.findById(userId).select(
    'city locationName profession privacySettings'
  );
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }


  const blockedUsers = await BlockedUser.find({
    $or: [{ blockerId: userId }, { blockedId: userId }],
  }).select('blockerId blockedId');

  const blockedUserIds = blockedUsers.map(block =>
    block.blockerId.toString() === userId
      ? block.blockedId.toString()
      : block.blockerId.toString()
  );

  const excludeGroups = await Group.find({
    $or: [
      { members: userId },
      { pendingMembers: userId },
      { creatorId: { $in: blockedUserIds } },
    ],
  }).select('_id');

  const query: Record<string, any> = {
    _id: { $nin: excludeGroups.map(g => g._id) },
    isDeleted: false,
    privacy: GroupPrivacy.PUBLIC,
  };

  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = -1;
  options.select =
    'name groupImage privacy participantCount createdAt updatedAt';

  const groups = await Group.paginate(query, options);
  return groups;
};

export const GroupService = {
  createGroup,
  joinGroup,
  leaveGroup,
  approveJoinRequest,
  rejectJoinRequest,
  removeMember,
  promoteToAdmin,
  demoteAdmin,
  promoteToCoLeader,
  demoteCoLeader,
  getGroup,
  updateGroup,
  deleteGroup,
  getMyGroups,
  getMyJoinGroups,
  getGroupSuggestions,
};
