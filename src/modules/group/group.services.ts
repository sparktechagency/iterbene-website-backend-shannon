import mongoose from 'mongoose';
import { IGroup } from './group.interface';
import Group from './group.model';
import { IGroupInvite } from '../groupInvite/groupInvite.interface';
import GroupInvite from '../groupInvite/groupInvite.model';
import { User } from '../user/user.model';
import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

// Creates a new travel group by a user
const createGroup = async (payload: IGroup): Promise<IGroup> => {
  const {
    creatorId,
    name,
    privacy,
    description,
    location,
    locationName,
    groupImage,
  } = payload;

  // Create a new group with the provided details
  const group = new Group({
    creatorId,
    name,
    groupImage,
    privacy,
    admins: [creatorId],
    members: [creatorId],
    locationName,
    pendingMembers: [],
    description,
    location,
    participantCount:  1,
  });
  // Save the group to the database
  await group.save();
  // Populate related fields for detailed response
  const result = await Group.findById(group._id).populate(
    'creatorId admins members pendingMembers'
  );
  return result as IGroup;
};

// Allows a user to join a travel group
const joinGroup = async (userId: string, groupId: string): Promise<IGroup> => {
  // Fetch the group by ID
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  } else if (group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group is deleted');
  }

  // Verify the user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  // Check if the user is already a member
  if (group.members.some(id => id.toString() === userObjectId.toString())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You are already a member');
  }

  // Handle public vs private groups
  if (group.privacy === 'public') {
    group.members.push(userObjectId);
    group.participantCount += 1;
  } else {
    // For private groups, check if a join request is already pending
    if (group.pendingMembers.some(id => id.equals(userObjectId))) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have already sent a join request'
      );
    }
    group.pendingMembers.push(userObjectId);
  }

  // Save the updated group
  await group.save();
  const result = await Group.findById(group._id).populate(
    'creatorId admins members pendingMembers'
  );
  return result as IGroup;
};

// Approves a user's join request for a private travel group
const approveJoinRequest = async (
  adminId: string,
  groupId: string,
  userId: string
): Promise<IGroup> => {
  // Fetch the group by ID
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  } else if (group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group is deleted');
  }

  // Verify the requester is an admin
  const adminObjectId = new mongoose.Types.ObjectId(adminId);
  if (!group.admins.some(id => id.equals(adminObjectId))) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Only admins can approve join requests'
    );
  }

  // Check if the user has a pending join request
  const userObjectId = new mongoose.Types.ObjectId(userId);
  if (!group.pendingMembers.some(id => id.equals(userObjectId))) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'User has not sent a join request'
    );
  }

  // Remove from pending and add to members
  group.pendingMembers = group.pendingMembers.filter(
    id => !id.equals(userObjectId)
  );
  group.members.push(userObjectId);
  group.participantCount += 1;
  await group.save();

  const result = await Group.findById(group._id).populate(
    'creatorId admins members pendingMembers'
  );
  return result as IGroup;
};

// Sends an invitation to join a travel group
const sendGroupInvite = async (
  fromUserId: string,
  toUserId: string,
  groupId: string
): Promise<IGroupInvite> => {
  // Fetch the group by ID
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }
  if (group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group is deleted');
  }

  // Verify both users exist
  const fromUser = await User.findById(fromUserId);
  if (!fromUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'From User not found');
  }
  const toUser = await User.findById(toUserId);
  if (!toUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'To User not found');
  }

  const fromUserObjectId = new mongoose.Types.ObjectId(fromUserId);
  const toUserObjectId = new mongoose.Types.ObjectId(toUserId);

  // Verify sender is a member
  if (!group.members.some(id => id.equals(fromUserObjectId))) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Only members can send invites'
    );
  }

  // Check if recipient is already a member
  if (group.members.some(id => id.equals(toUserObjectId))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is already a member');
  }

  // Check for existing pending invite
  const existingInvite = await GroupInvite.findOne({
    from: fromUserObjectId,
    to: toUserObjectId,
    groupId,
    status: 'pending',
  });
  if (existingInvite) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite already sent');
  }

  // Create and save the invite
  const invite = new GroupInvite({
    from: fromUserObjectId,
    to: toUserObjectId,
    groupId,
    status: 'pending',
  });

  await invite.save();
  const result = await GroupInvite.findById(invite._id).populate(
    'from to groupId'
  );
  return result as IGroupInvite;
};

// Accepts a group invitation, adding the user to the travel group
const acceptGroupInvite = async (
  userId: string,
  inviteId: string
): Promise<IGroup> => {
  // Fetch the invite and its associated group
  const invite = await GroupInvite.findById(inviteId).populate('groupId');
  if (!invite) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invite not found');
  }
  if (invite.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite is not pending');
  }
  if (invite.to.toString() !== userId) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Unauthorized to accept this invite'
    );
  }

  // Fetch the group
  const group = await Group.findById(invite.groupId);
  if (!group) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  // Update invite status
  invite.status = 'accepted';
  invite.updatedAt = new Date();
  await invite.save();

  // Add user to group members
  const userObjectId = new mongoose.Types.ObjectId(userId);
  group.members.push(userObjectId);
  group.participantCount += 1;
  // Remove from pending members if present
  group.pendingMembers = group.pendingMembers.filter(
    id => !id.equals(userObjectId)
  );
  await group.save();

  const result = await Group.findById(group._id).populate(
    'creatorId admins members pendingMembers'
  );
  return result as IGroup;
};

// Declines a group invitation
const declineGroupInvite = async (
  userId: string,
  inviteId: string
): Promise<IGroupInvite> => {
  // Fetch the invite
  const invite = await GroupInvite.findById(inviteId);
  if (!invite || invite.status !== 'pending') {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invite not found');
  }

  // Verify the user is the invite recipient
  if (invite.to.toString() !== userId) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Unauthorized to accept this invite'
    );
  }

  // Update invite status
  invite.status = 'declined';
  invite.updatedAt = new Date();
  await invite.save();

  return invite as IGroupInvite;
};

// Promotes a group member to co-leader (admin)
const addCoLeadersInGroup = async (
  adminId: string,
  groupId: string,
  coLeaders: string[]
): Promise<IGroup> => {
  // Fetch the group
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  // Verify the requester is an admin
  const adminObjectId = new mongoose.Types.ObjectId(adminId);
  if (!group.admins.some(id => id.equals(adminObjectId))) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Only admins can add co-leaders'
    );
  }

  // Add co-leaders to group admins and updated the participant count
  group.admins.push(...coLeaders.map(id => new mongoose.Types.ObjectId(id)));
  group.participantCount += coLeaders.length;

  // Remove co-leaders from pending members if present
  group.pendingMembers = group.pendingMembers.filter(
    id => !coLeaders.some(coLeader => coLeader === id.toString())
  );
  await group.save();

  const result = await Group.findById(group._id).populate(
    'creatorId admins members pendingMembers'
  );
  return result as IGroup;
};

// Soft deletes a travel group (marks as deleted)
const deleteGroup = async (adminId: string, groupId: string): Promise<void> => {
  // Fetch the group
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  // Verify the requester is the group creator
  if (group.creatorId.toString() !== adminId) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Only group creator can delete the group'
    );
  }

  // Mark group as deleted
  group.isDeleted = true;
  group.updatedAt = new Date();
  await group.save();
};

const leaveGroup = async (userId: string, groupId: string): Promise<IGroup> => {
  // Fetch the group
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  // Remove user from group members
  const userObjectId = new mongoose.Types.ObjectId(userId);

  //if userId is creatorId . 1st off all any any user to Creator to leave group
  if (group.creatorId.toString() === userId) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Creator cannot leave the group'
    );
  }
  group.members = group.members.filter(id => !id.equals(userObjectId));
  group.participantCount -= 1;
  await group.save();

  const result = await Group.findById(group._id).populate(
    'creatorId admins members pendingMembers'
  );
  return result as IGroup;
};

// Retrieves a travel group's details
const getGroup = async (groupId: string): Promise<IGroup> => {
  // Fetch the group with populated fields
  const group = await Group.findById(groupId).populate(
    'creatorId admins members pendingMembers'
  );
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }
  return group as IGroup;
};

export const GroupService = {
  createGroup,
  joinGroup,
  approveJoinRequest,
  sendGroupInvite,
  acceptGroupInvite,
  declineGroupInvite,
  addCoLeadersInGroup,
  leaveGroup,
  deleteGroup,
  getGroup,
};
