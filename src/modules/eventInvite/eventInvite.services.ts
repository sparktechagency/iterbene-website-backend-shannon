import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { EventInviteStatus, IEventInvite } from './eventInvite.interface';
import { EventInvite } from './eventInvite.model';
import { Types } from 'mongoose';
import { Event } from '../event/event.model';
import { Maps } from '../maps/maps.model';
import mongoose from 'mongoose';
import { validateUsers } from '../../utils/validateUsers';
import { User } from '../user/user.model';
import { INotification } from '../notification/notification.interface';
import { NotificationService } from '../notification/notification.services';

const sendInvite = async (
  fromId: string,
  payload: { eventId: string; to: string | string[] }
): Promise<IEventInvite[]> => {
  const event = await Event.findById(payload.eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }

  // Validate sender is a member or admin
  if (
    !event.interestedUsers.includes(new mongoose.Types.ObjectId(fromId)) &&
    !event.coHosts.includes(new mongoose.Types.ObjectId(fromId)) &&
    !event.creatorId.equals(fromId)
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only event interested users, co-hosts, or creator can send invites'
    );
  }

  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

  // Validate recipients
  for (const toId of recipients) {
    await validateUsers(fromId, toId, 'Invite to event');
    const user = await User.findById(toId);
    if (!user || user.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, `User ${toId} not found`);
    }
    if (
      event.interestedUsers.includes(new mongoose.Types.ObjectId(toId)) ||
      event.pendingInterestedUsers.includes(new mongoose.Types.ObjectId(toId))
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `User ${toId} is already an interested user of the event`
      );
    }
    const existingInvite = await EventInvite.findOne({
      from: fromId,
      to: toId,
      eventId: payload.eventId,
      status: EventInviteStatus.PENDING,
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
    eventId: new mongoose.Types.ObjectId(payload.eventId),
    status: EventInviteStatus.PENDING,
  }));
  event.pendingInterestedUsers.push(
    ...recipients.map(toId => new mongoose.Types.ObjectId(toId))
  );
  const createdInvites = await EventInvite.insertMany(invites);

  // Send notification to each recipient
  const sender = await User.findById(fromId);
  for (const toId of recipients) {
    const eventInvitedNotification: INotification = {
      receiverId: toId,
      title: `New Event Invite from ${sender?.fullName || 'Someone'}`,
      message: `You've been invited to "${event.eventName}" by ${
        sender?.fullName || 'a user'
      }. Check it out!`,
      type: 'event',
      image: event.eventImage,
      linkId: payload.eventId,
      role: 'user',
      viewStatus: false,
    };
    await NotificationService.addCustomNotification(
      'notification',
      eventInvitedNotification,
      toId
    );
  }

  await event.save();
  return createdInvites;
};

const acceptInvite = async (
  userId: string,
  inviteId: string
): Promise<IEventInvite> => {
  // Find invite
  const invite = await EventInvite.findById(inviteId);
  if (!invite) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invite not found');
  }
  if (!invite.to.equals(userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only invite recipient can accept'
    );
  }
  if (invite.status !== EventInviteStatus.PENDING) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite is not pending');
  }

  // Find event
  const event = await Event.findById(invite.eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }

  // Update invite status
  invite.status = EventInviteStatus.ACCEPTED;
  if (!event.interestedUsers.includes(invite.to)) {
    event.interestedUsers.push(invite.to);
    event.interestCount += 1;
  }
  // Update event: remove from pendingInterestedUsers
  event.pendingInterestedUsers = event.pendingInterestedUsers.filter(
    user => !user.equals(invite.to)
  );
  await Promise.all([invite.save(), event.save()]);

  // Send notification to sender
  const recipient = await User.findById(userId);
  const senderNotification: INotification = {
    receiverId: invite.from.toString(),
    title: `${recipient?.fullName || 'Someone'} Accepted Your Invite`,
    message: `${recipient?.fullName || 'A user'} has accepted your invite to "${
      event.eventName
    }".`,
    type: 'event',
    linkId: invite.eventId.toString(),
    role: 'user',
    viewStatus: false,
  };
  await NotificationService.addCustomNotification(
    'notification',
    senderNotification,
    invite.from.toString()
  );

  // Update or add maps user interested locations
  const maps = await Maps.findOne({ userId });
  if (maps) {
    // Check for duplicate interestedLocation
    const isDuplicate = maps.interestedLocation.find(
      location =>
        location.latitude == event.location.latitude &&
        location.longitude == event.location.longitude &&
        location.interestedLocationName == event.locationName
    );
    if (!isDuplicate) {
      maps.interestedLocation.push({
        latitude: event.location.latitude,
        longitude: event.location.longitude,
        interestedLocationName: event.locationName,
      });
      await maps.save();
    }
  } else {
    await Maps.create({
      userId,
      interestedLocation: [
        {
          latitude: event.location.latitude,
          longitude: event.location.longitude,
          interestedLocationName: event.locationName,
        },
      ],
    });
  }
  return invite;
};

const declineInvite = async (
  userId: string,
  inviteId: string
): Promise<IEventInvite> => {
  const invite = await EventInvite.findById(inviteId);
  if (!invite) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invite not found');
  }
  if (!invite.to.equals(userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only invite recipient can decline'
    );
  }
  // Find event
  const event = await Event.findById(invite.eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (invite.status !== EventInviteStatus.PENDING) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite is not pending');
  }
  invite.status = EventInviteStatus.DECLINED;
  // Update event: remove from pendingInterestedUsers
  event.pendingInterestedUsers = event.pendingInterestedUsers.filter(
    user => !user.equals(invite.to)
  );
  await Promise.all([invite.save(), event.save()]);

  // Send notification to sender
  const recipient = await User.findById(userId);
  const senderNotification: INotification = {
    receiverId: invite.from.toString(),
    title: `${recipient?.fullName || 'Someone'} Declined Your Invite`,
    message: `${recipient?.fullName || 'A user'} has declined your invite to "${
      event.eventName
    }".`,
    type: 'event',
    linkId: invite.eventId.toString(),
    role: 'user',
    viewStatus: false,
  };
  await NotificationService.addCustomNotification(
    'notification',
    senderNotification,
    invite.from.toString()
  );

  return invite;
};

const cancelInvite = async (
  userId: string,
  inviteId: string
): Promise<IEventInvite> => {
  const invite = await EventInvite.findById(inviteId);
  if (!invite) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invite not found');
  }
  const event = await Event.findById(invite.eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (
    !invite.from.equals(userId) &&
    !event.coHosts.includes(new Types.ObjectId(userId)) &&
    !event.creatorId.equals(userId)
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only sender or co-hosts can cancel invite'
    );
  }
  if (invite.status !== EventInviteStatus.PENDING) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite is not pending');
  }
  invite.status = EventInviteStatus.DECLINED;

  event.pendingInterestedUsers = event.pendingInterestedUsers.filter(
    user => !user.equals(invite.to)
  );
  await Promise.all([invite.save(), event.save()]);

  // Send notification to recipient
  const sender = await User.findById(userId);
  const recipientNotification: INotification = {
    receiverId: invite.to.toString(),
    title: `Invite to ${event.eventName} Cancelled`,
    message: `${
      sender?.fullName || 'The sender'
    } has cancelled your invite to "${event.eventName}".`,
    type: 'event',
    linkId: invite.eventId.toString(),
    role: 'user',
    viewStatus: false,
  };
  await NotificationService.addCustomNotification(
    'notification',
    recipientNotification,
    invite.to.toString()
  );

  return invite;
};

const getMyInvites = async (
  filters: Record<string, any>,
  options: PaginateOptions
) => {
  const foundInvites = await EventInvite.find({ to: filters.userId });
  if (foundInvites.length === 0) {
    return {
      results: [],
      page: 1,
      limit: 10,
      totalResults: 0,
      totalPages: 1,
    };
  }

  // Filter out invites for deleted events
  const eventIds = foundInvites.map(invite => invite.eventId);
  const events = await Event.find({ _id: { $in: eventIds }, isDeleted: false });
  if (events?.length === 0) {
    return {
      results: [],
      page: 1,
      limit: 10,
      totalResults: 0,
      totalPages: 1,
    };
  }

  const query: Record<string, any> = {
    to: filters.userId,
    status: EventInviteStatus.PENDING,
  };

  // Invitation count
  const invitationCount = await EventInvite.countDocuments({
    to: filters.userId,
    status: EventInviteStatus.PENDING,
  });

  options.select = '-__v -updatedAt';
  options.populate = [
    {
      path: 'eventId',
      select:
        'eventName eventImage startDate endDate duration eventCost interestCount',
      populate: {
        path: 'creatorId',
        select: 'fullName username profileImage',
      },
    },
  ];
  options.sortBy = options.sortBy || '-createdAt';
  const result = await EventInvite.paginate(query, options);
  return {
    ...result,
    invitationCount,
  };
};

export const EventInviteService = {
  sendInvite,
  acceptInvite,
  declineInvite,
  cancelInvite,
  getMyInvites,
};
