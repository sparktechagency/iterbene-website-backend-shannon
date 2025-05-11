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
import { UserService } from '../user/user.service';

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
  const user = await User.findById(creatorId);
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Creator not found');
  }

  const coLeaders = payload.coLeaders || [];
  const members = payload.members || [];
  const uniqueUsers = [...new Set([...coLeaders, ...members])].filter(
    id => id !== creatorId
  );

  for (const userId of uniqueUsers) {
    await validateUsers(creatorId, userId, 'Add to group');
    const targetUser = await User.findById(userId);
    if (!targetUser || targetUser.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, `User ${userId} not found`);
    }
  }

  const validCoLeaders = coLeaders.filter(id => id !== creatorId);
  const validMembers = members.filter(
    id => id !== creatorId && !validCoLeaders.includes(id)
  );

  const group = new Group({
    creatorId,
    name: payload.name,
    description: payload.description || '',
    groupImage: payload.groupImage || null,
    privacy: payload.privacy,
    location: payload.location,
    locationName: payload.locationName,
    admins: [creatorId],
    coLeaders: validCoLeaders.map(id => new mongoose.Types.ObjectId(id)),
    members: [
      creatorId,
      ...validMembers.map(id => new mongoose.Types.ObjectId(id)),
    ],
    participantCount: 1 + validMembers.length,
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
  groupId: string,
  userId: string
): Promise<Partial<IGroup>> => {
  const group = await Group.findById(groupId).populate(
    'creatorId admins coLeaders members pendingMembers',
    'username profileImage'
  );
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
    $or: [{ creatorId: userId }, { admins: userId }, { members: userId }],
  };

  if (filters.privacy) {
    query.privacy = filters.privacy;
  }

  options.sortBy = options.sortBy || '-createdAt';
  const groups = await Group.paginate(query, options);
  return groups;
};

const getMyJoinGroups = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IGroup>> => {
  const query: Record<string, any> = {
    isDeleted: false,
    $or: [{ members: userId }, { pendingMembers: userId }],
  };

  if (filters.privacy) {
    query.privacy = filters.privacy;
  }

  options.sortBy = options.sortBy || '-createdAt';
  const groups = await Group.paginate(query, options);
  return groups;
};

const getGroupSuggestions = async (
  userId: string,
  limit: number = 10,
  options: { skip?: number; sortBy?: string } = {}
): Promise<{ groups: Partial<IGroup>[]; total: number }> => {
  const user = await User.findById(userId).select(
    'city locationName profession privacySettings'
  );
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const connections = await Connections.find({
    $or: [{ sentBy: userId }, { receivedBy: userId }],
    status: ConnectionStatus.ACCEPTED,
  }).select('sentBy receivedBy');

  const friends = connections.map(conn =>
    conn.sentBy.toString() === userId
      ? conn.receivedBy.toString()
      : conn.sentBy.toString()
  );

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
    $or: [{ privacy: GroupPrivacy.PUBLIC }],
  };

  if (user.city && user.privacySettings.city === 'Public') {
    query.$or.push({ locationName: user.city });
  }
  if (user.locationName && user.privacySettings.locationName === 'Public') {
    query.$or.push({ locationName: user.locationName });
  }

  if (friends.length > 0) {
    query.$or.push({ members: { $in: friends } });
  }

  const groups = await Group.find(query)
    .select('name groupImage privacy participantCount')
    .skip(options.skip || 0)
    .limit(limit)
    .sort(options.sortBy || '-participantCount');

  const total = await Group.countDocuments(query);

  const filteredGroups = groups.map(group => ({
    _id: group._id,
    name: group.name,
    groupImage: group.groupImage,
    privacy: group.privacy,
    participantCount: group.participantCount,
  }));

  return { groups: filteredGroups, total };
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
