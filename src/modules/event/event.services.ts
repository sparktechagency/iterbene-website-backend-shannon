import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { Event } from './event.model';
import { IEvent, EventPrivacy } from './event.interface';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import ApiError from '../../errors/ApiError';

const createEvent = async (payload: Partial<IEvent>): Promise<IEvent> => {
  const event = await Event.create(payload);
  return event;
};

const joinEvent = async (userId: string, eventId: string): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  const userObjectId = new Types.ObjectId(userId);
  if (event.interests.includes(userObjectId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Already interested in event');
  }
  if (
    event.privacy === EventPrivacy.PRIVATE &&
    !event.coHosts.includes(userObjectId) &&
    !event.creatorId.equals(userId)
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Cannot join private event without invite'
    );
  }
  event.interests.push(userObjectId);
  await event.save();
  return event;
};

const leaveEvent = async (userId: string, eventId: string): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (event.creatorId.equals(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Creator cannot leave event');
  }
  const userObjectId = new Types.ObjectId(userId);
  if (!event.interests.includes(userObjectId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Not interested in event');
  }
  event.interests = event.interests.filter(id => !id.equals(userObjectId));
  await event.save();
  return event;
};

const removeUser = async (
  userId: string,
  eventId: string,
  targetUserId: string
): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (
    !event.coHosts.includes(new Types.ObjectId(userId)) &&
    !event.creatorId.equals(userId)
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only co-hosts or creator can remove users'
    );
  }
  const targetUserObjectId = new Types.ObjectId(targetUserId);
  if (!event.interests.includes(targetUserObjectId)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'User is not interested in event'
    );
  }
  event.interests = event.interests.filter(
    id => !id.equals(targetUserObjectId)
  );
  await event.save();
  return event;
};

const promoteToCoHost = async (
  userId: string,
  eventId: string,
  targetUserId: string
): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (
    !event.coHosts.includes(new Types.ObjectId(userId)) &&
    !event.creatorId.equals(userId)
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only co-hosts or creator can promote co-hosts'
    );
  }
  const targetUserObjectId = new Types.ObjectId(targetUserId);
  if (!event.interests.includes(targetUserObjectId)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'User is not interested in event'
    );
  }
  if (event.coHosts.includes(targetUserObjectId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is already a co-host');
  }
  event.coHosts.push(targetUserObjectId);
  await event.save();
  return event;
};

const demoteCoHost = async (
  userId: string,
  eventId: string,
  coHostId: string
): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (!event.creatorId.equals(userId)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only creator can demote co-hosts'
    );
  }
  const coHostObjectId = new Types.ObjectId(coHostId);
  if (!event.coHosts.includes(coHostObjectId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a co-host');
  }
  event.coHosts = event.coHosts.filter(id => !id.equals(coHostObjectId));
  await event.save();
  return event;
};

const getEvent = async (eventId: string, userId: string): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (
    event.privacy === EventPrivacy.PRIVATE &&
    !event.interests.includes(new Types.ObjectId(userId)) &&
    !event.coHosts.includes(new Types.ObjectId(userId)) &&
    !event.creatorId.equals(userId)
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Cannot access private event');
  }
  return event;
};

const updateEvent = async (
  userId: string,
  eventId: string,
  payload: Partial<IEvent>
): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (
    !event.coHosts.includes(new Types.ObjectId(userId)) &&
    !event.creatorId.equals(userId)
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only co-hosts or creator can update event'
    );
  }
  Object.assign(event, payload);
  await event.save();
  return event;
};

const deleteEvent = async (
  userId: string,
  eventId: string
): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (!event.creatorId.equals(userId)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only creator can delete event');
  }
  event.isDeleted = true;
  await event.save();
  return event;
};

const getMyEvents = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IEvent>> => {
  const query = {
    ...filters,
    isDeleted: false,
    $or: [
      { creatorId: new Types.ObjectId(userId) },
      { coHosts: new Types.ObjectId(userId) },
      { interests: new Types.ObjectId(userId) },
    ],
  };
  return Event.paginate(query, options);
};

const getMyInterestedEvents = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IEvent>> => {
  const query = {
    ...filters,
    isDeleted: false,
    interests: new Types.ObjectId(userId),
  };
  return Event.paginate(query, options);
};

const getEventSuggestions = async (
  userId: string,
  limit: number,
  options: { skip: number; sortBy?: string }
): Promise<IEvent[]> => {
  const query = {
    isDeleted: false,
    privacy: EventPrivacy.PUBLIC,
    interests: { $ne: new Types.ObjectId(userId) },
  };
  return Event.find(query)
    .sort(options.sortBy || '-createdAt')
    .skip(options.skip)
    .limit(limit)
    .lean();
};

export const EventService = {
  createEvent,
  joinEvent,
  leaveEvent,
  removeUser,
  promoteToCoHost,
  demoteCoHost,
  getEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getMyInterestedEvents,
  getEventSuggestions,
};
