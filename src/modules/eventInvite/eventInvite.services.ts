import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { EventInviteStatus, IEventInvite } from './eventInvite.interface';
import { EventInvite } from './eventInvite.model';
import { Types } from 'mongoose';
import { Event } from '../event/event.model';

const sendInvite = async (
  userId: string,
  payload: { eventId: string; to: string | string[] }
): Promise<IEventInvite[]> => {
  const event = await Event.findById(payload.eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (
    !event.interests.includes(new Types.ObjectId(userId)) &&
    !event.coHosts.includes(new Types.ObjectId(userId)) &&
    !event.creatorId.equals(userId)
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only interested users or co-hosts can send invites'
    );
  }
  const toArray = Array.isArray(payload.to) ? payload.to : [payload.to];
  const invites = await Promise.all(
    toArray.map(async toId => {
      const existingInvite = await EventInvite.findOne({
        eventId: payload.eventId,
        to: new Types.ObjectId(toId),
        status: EventInviteStatus.PENDING,
      });
      if (existingInvite) {
        return existingInvite;
      }
      return EventInvite.create({
        from: new Types.ObjectId(userId),
        to: new Types.ObjectId(toId),
        eventId: new Types.ObjectId(payload.eventId),
        status: EventInviteStatus.PENDING,
      });
    })
  );
  return invites;
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
  event.interests.push(invite.to);
  await Promise.all([invite.save(), event.save()]);
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
): Promise<PaginateResult<IEventInvite>> => {
  const query: Record<string, any> = { to: filters.userId };
  options.populate = [
    {
      path: 'from',
      select: 'name email',
    },
    {
      path: 'to',
      select: 'name email',
    },
  ];
  options.sortBy = options.sortBy || '-createdAt';
  return EventInvite.paginate(query, options);
};

export const EventInviteService = {
  sendInvite,
  acceptInvite,
  declineInvite,
  cancelInvite,
  getMyInvites,
};
