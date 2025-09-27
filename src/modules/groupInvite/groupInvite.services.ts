import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { IGroupInvite } from './groupInvite.interface';
import GroupInvite from './groupInvite.model';
import { User } from '../user/user.model';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import mongoose from 'mongoose';
import Group from '../group/group.model';
import { validateUsers } from '../../utils/validateUsers';
import { NotificationService } from '../notification/notification.services';
import { INotification } from '../notification/notification.interface';

interface InvitePayload {
  groupId: string;
  to: string | string[]; // Single user ID or array of user IDs
}

const sendInvite = async (fromId: string, payload: InvitePayload) => {
  const group = await Group.findById(payload.groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }
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

  group.pendingMembers.push(
    ...recipients.map(toId => new mongoose.Types.ObjectId(toId))
  );
  // Don't add to pendingMembers immediately - only when user accepts
  const createdInvites = await GroupInvite.insertMany(invites);

  // Send notification to each recipient
  const sender = await User.findById(fromId);
  const notifications: INotification[] = recipients.map(toId => ({
    senderId: fromId,
    receiverId: toId,
    title: `${sender?.firstName} ${sender?.lastName} invited you to a group`,
    message: `${sender?.firstName} ${sender?.lastName} invited you to join "${
      group.name ?? 'a group'
    }". Check it out!`,
    type: 'group',
    linkId: payload.groupId,
    role: 'user',
    viewStatus: false,
    image: group.groupImage ?? sender?.profileImage,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await Promise.all(
    notifications.map((notification, index) =>
      NotificationService?.addCustomNotification?.(
        'notification',
        notification,
        recipients[index]
      )
    )
  );

  // No need to save group since we're not modifying pendingMembers
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

  const sender = await User.findById(invite.from);
  const recipient = await User.findById(userId);
  const isSenderAdmin = group.admins.includes(
    new mongoose.Types.ObjectId(invite.from.toString())
  );

  if (group.privacy === 'public' || isSenderAdmin) {
    // remove from pendingMembers if present
    group.pendingMembers = group.pendingMembers.filter(
      memberId => !memberId.equals(userId)
    );
    // For public groups or admin invites: directly add to members
    group.members.push(new mongoose.Types.ObjectId(userId));
    group.participantCount += 1;

    // Notify the sender
    const senderNotification: INotification = {
      senderId: userId,
      receiverId: invite.from.toString(),
      title: `${recipient?.firstName} ${recipient?.lastName} joined your group`,
      message: `${recipient?.firstName} ${
        recipient?.lastName
      } accepted your invite to "${group.name ?? 'a group'}".`,
      type: 'group',
      linkId: invite.groupId.toString(),
      role: 'user',
      viewStatus: false,
      image: group.groupImage ?? recipient?.profileImage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await NotificationService?.addCustomNotification?.(
      'notification',
      senderNotification,
      invite.from.toString()
    );
  } else {
    // For private groups: add to pendingMembers for admin approval
    if (!group.pendingMembers.includes(new mongoose.Types.ObjectId(userId))) {
      group.pendingMembers.push(new mongoose.Types.ObjectId(userId));
    }
    // Notify group admins
    const adminNotifications: INotification[] = group.admins.map(adminId => ({
      senderId: userId,
      receiverId: adminId.toString(),
      title: `${recipient?.firstName} ${recipient?.lastName}requested to join your group`,
      message: `${recipient?.firstName} ${
        recipient?.lastName
      } accepted an invite to "${
        group.name ?? 'a group'
      }" and is awaiting approval.`,
      type: 'group',
      linkId: invite?.groupId?.toString(),
      role: 'admin',
      viewStatus: false,
      image: group?.groupImage ?? recipient?.profileImage,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await Promise.all(
      adminNotifications.map(notification =>
        NotificationService?.addCustomNotification?.(
          'notification',
          notification,
          notification.receiverId?.toString()
        )
      )
    );
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

  const group = await Group.findById(invite.groupId);
  if (!group || group.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  // Remove from pendingMembers if user was added there
  group.pendingMembers = group.pendingMembers.filter(
    memberId => !memberId.equals(userId)
  );
  await group.save();

  const recipient = await User.findById(userId);
  const senderNotification: INotification = {
    senderId: userId,
    receiverId: invite.from.toString(),
    title: `${recipient?.firstName} ${recipient?.lastName} declined your group invite`,
    message: `${recipient?.firstName} ${
      recipient?.lastName
    } won't be joining "${group.name ?? 'your group'}".`,
    type: 'group',
    linkId: invite.groupId.toString(),
    role: 'user',
    viewStatus: false,
    image: group.groupImage ?? recipient?.profileImage,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await NotificationService?.addCustomNotification?.(
    'notification',
    senderNotification,
    invite.from.toString()
  );

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

  // Remove from pendingMembers if added there
  group.pendingMembers = group.pendingMembers.filter(
    memberId => !memberId.equals(invite.to.toString())
  );
  await group.save();

  const sender = await User.findById(userId);
  const recipientNotification: INotification = {
    senderId: userId,
    receiverId: invite.to.toString(),
    title: `Invite to ${group.name ?? 'a group'} canceled`,
    message: `${sender?.firstName} ${
      sender?.lastName
    } canceled your invite to "${group.name ?? 'a group'}".`,
    type: 'group',
    linkId: invite.groupId.toString(),
    role: 'user',
    viewStatus: false,
    image: group.groupImage ?? sender?.profileImage,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await NotificationService?.addCustomNotification?.(
    'notification',
    recipientNotification,
    invite.to.toString()
  );

  await invite.deleteOne();
  return invite;
};

const getMyInvites = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IGroupInvite>> => {
  const foundInvites = await GroupInvite.find({ to: userId });
  if (foundInvites.length === 0) {
    return {
      results: [],
      page: 1,
      limit: 10,
      totalResults: 0,
      totalPages: 1,
    };
  }
  //filter not response deleted group
  const groupIds = foundInvites.map(invite => invite.groupId);
  const groups = await Group.find({ _id: { $in: groupIds }, isDeleted: false });
  if (groups.length === 0) {
    return {
      results: [],
      page: 1,
      limit: 10,
      totalResults: 0,
      totalPages: 1,
    };
  }

  const query: Record<string, any> = { to: userId, status: 'pending' };
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.groupId) {
    query.groupId = filters.groupId;
  }
  options.populate = [
    {
      path: 'groupId',
      select: 'name groupImage privacy participantCount createdAt updatedAt',
    },
  ];
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
