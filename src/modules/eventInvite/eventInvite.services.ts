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

const sendInvite = async (
  fromId: string,
  payload: { eventId: string; to: string | string[] }
): Promise<IEventInvite[]> => {
  const event = await Event.findById(payload.eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Group not found');
  }

  // Validate sender is a member or admin
  if (
    !event.interestedUsers.includes(new mongoose.Types.ObjectId(fromId)) &&
    !event.coHosts.includes(new mongoose.Types.ObjectId(fromId)) &&
    !event.creatorId.equals(fromId)
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only group interested users or co-hosts or creator can send invites'
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
        `User ${toId} is already a interested user of the event`
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
  await event.save();
  return createdInvites;
};

const acceptInvite = async (
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
      'Only invite recipient can accept'
    );
  }
  if (invite.status !== EventInviteStatus.PENDING) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite is not pending');
  }
  const event = await Event.findById(invite.eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  invite.status = EventInviteStatus.ACCEPTED;
  if (!event.interestedUsers.includes(invite.to)) {
    event.interestedUsers.push(invite.to);
    event.interestCount += 1;
  }
  await Promise.all([invite.save(), event.save()]);

  //update or add maps user interested locations
  const mapsUser = await Maps.findOne({ userId });
  if (mapsUser) {
    mapsUser.interestedLocation.push({
      latitude: event.location.latitude,
      longitude: event.location.longitude,
      interestedLocationName: event.locationName,
    });
    await mapsUser.save();
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
  if (invite.status !== EventInviteStatus.PENDING) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invite is not pending');
  }
  invite.status = EventInviteStatus.DECLINED;
  await invite.save();
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
  await invite.save();
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

  //filter not response deleted events
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

  const query: Record<string, any> = { to: filters.userId , status: EventInviteStatus.PENDING};

  //invitation count
  const invitationCount = await EventInvite.countDocuments({
    to: filters.userId,
    status: EventInviteStatus.PENDING,
  });

  options.select = '-__v -updatedAt';
  options.populate = [
    {
      path: 'eventId',
      select:
        'eventName eventImage  startDate endDate duration eventCost interestCount',
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
