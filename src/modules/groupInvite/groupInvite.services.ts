import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { IGroupInvite } from './groupInvite.interface';
import GroupInvite from './groupInvite.model';
import { User } from '../user/user.model';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import mongoose from 'mongoose';
import Group from '../group/group.model';
import { validateUsers } from '../../utils/validateUsers';

interface InvitePayload {
  groupId: string;
  to: string | string[]; // Single user ID or array of user IDs
}

const sendInvite = async (fromId: string, payload: InvitePayload) => {
  const group = await Group.findById(payload.groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  // Validate sender is a member or admin
  if (
    !group.members.includes(new mongoose.Types.ObjectId(fromId)) &&
    !group.admins.includes(new mongoose.Types.ObjectId(fromId))
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only group members or admins can send invites'
    );
  }

  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

  // Validate recipients
  for (const toId of recipients) {
    await validateUsers(fromId, toId, 'Invite to group');
    const user = await User.findById(toId);
    if (!user || user.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, `User ${toId} not found`);
    }
    if (
      group.members.includes(new mongoose.Types.ObjectId(toId)) ||
      group.pendingMembers.includes(new mongoose.Types.ObjectId(toId))
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `User ${toId} is already a member or pending`
      );
    }
    const existingInvite = await GroupInvite.findOne({
      from: fromId,
      to: toId,
      groupId: payload.groupId,
      status: 'pending',
    });
    if (existingInvite) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Invite already sent to user ${toId}`
      );
    }
  }

  const invites = recipients.map(toId => ({
    from: new mongoose.Types.ObjectId(fromId),
    to: new mongoose.Types.ObjectId(toId),
    groupId: new mongoose.Types.ObjectId(payload.groupId),
    status: 'pending' as const,
  }));

  const createdInvites = await GroupInvite.insertMany(invites);

  return createdInvites;
};

const acceptInvite = async (
  userId: string,
  inviteId: string
): Promise<IGroupInvite> => {
  const invite = await GroupInvite.findById(inviteId);
  if (!invite) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invite not found');
  }
  if (invite.to.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot accept this invite');
  }
  if (invite.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite is not pending');
  }

  const group = await Group.findById(invite.groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  // Check if sender is admin for auto-join
  const isSenderAdmin = group.admins.includes(
    new mongoose.Types.ObjectId(invite.from.toString())
  );
  if (group.privacy === 'public' || isSenderAdmin) {
    // Auto-join for public groups or admin invites
    group.members.push(new mongoose.Types.ObjectId(userId));
    group.participantCount += 1;
  } else {
    // Private group, non-admin invite: add to pendingMembers
    if (!group.pendingMembers.includes(new mongoose.Types.ObjectId(userId))) {
      group.pendingMembers.push(new mongoose.Types.ObjectId(userId));
    }
  }

  await group.save();
  invite.status = 'accepted';
  await invite.save();
  return invite;
};

const declineInvite = async (
  userId: string,
  inviteId: string
): Promise<IGroupInvite> => {
  const invite = await GroupInvite.findById(inviteId);
  if (!invite) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invite not found');
  }
  if (invite.to.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot decline this invite');
  }
  if (invite.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite is not pending');
  }

  invite.status = 'declined';
  await invite.save();
  return invite;
};

const cancelInvite = async (
  userId: string,
  inviteId: string
): Promise<IGroupInvite> => {
  const invite = await GroupInvite.findById(inviteId);
  if (!invite) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invite not found');
  }

  const group = await Group.findById(invite.groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  const isAdmin = group.admins.includes(new mongoose.Types.ObjectId(userId));
  if (invite.from.toString() !== userId && !isAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only the sender or group admin can cancel this invite'
    );
  }

  if (invite.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite is not pending');
  }

  await invite.deleteOne();
  return invite;
};

const getMyInvites = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IGroupInvite>> => {
  const query: Record<string, any> = { to: userId };
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.groupId) {
    query.groupId = filters.groupId;
  }

  options.sortBy = options.sortBy || '-createdAt';
  const invites = await GroupInvite.paginate(query, options);
  return invites;
};

export const GroupInviteService = {
  sendInvite,
  acceptInvite,
  declineInvite,
  cancelInvite,
  getMyInvites,
};
