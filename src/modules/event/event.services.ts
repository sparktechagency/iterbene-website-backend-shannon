import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { Event } from './event.model';
import { IEvent, EventPrivacy } from './event.interface';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import ApiError from '../../errors/ApiError';

const createEvent = async (
  userId: string,
  payload: Partial<IEvent>
): Promise<IEvent> => {
  const eventData: Partial<IEvent> = {
    ...payload,
    creatorId: new Types.ObjectId(userId),
    interestedUsers: [new Types.ObjectId(userId)],
    interestCount: 1,
    pendingInterestedUsers: [],
    isDeleted: false,
  };
  const event = await Event.create(eventData);
  return event;
};
const interestEvent = async (
  userId: string,
  eventId: string
): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  const userObjectId = new Types.ObjectId(userId);
  if (event.interestedUsers.includes(userObjectId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Already interested in event');
  }
  if (event.pendingInterestedUsers.includes(userObjectId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Join request already pending');
  }
  if (event.privacy == EventPrivacy.PRIVATE) {
    event.pendingInterestedUsers.push(userObjectId);
    await event.save();
    return event;
  }
  event.interestedUsers.push(userObjectId);
  event.interestCount = event.interestedUsers.length;
  await event.save();
  return event;
};
const notInterestEvent = async (
  userId: string,
  eventId: string
): Promise<IEvent> => {
  const event = await Event.findById(eventId);
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  const userObjectId = new Types.ObjectId(userId);
  event.interestedUsers = event.interestedUsers.filter(
    id => !id.equals(userObjectId)
  );
  event.pendingInterestedUsers = event.pendingInterestedUsers.filter(
    id => !id.equals(userObjectId)
  );
  event.interestCount = event.interestedUsers.length;
  if (event.interestCount < 0) {
    event.interestCount = 0;
  }
  await event.save();
  return event;
};

const approveJoinEvent = async (
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
      'Only co-hosts or creator can approve join requests'
    );
  }
  const targetUserObjectId = new Types.ObjectId(targetUserId);
  if (!event.pendingInterestedUsers.includes(targetUserObjectId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No pending join request');
  }
  event.pendingInterestedUsers = event.pendingInterestedUsers.filter(
    id => !id.equals(targetUserObjectId)
  );
  event.interestedUsers.push(targetUserObjectId);
  await event.save();
  return event;
};

const rejectJoinEvent = async (
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
      'Only co-hosts or creator can reject join requests'
    );
  }
  const targetUserObjectId = new Types.ObjectId(targetUserId);
  if (!event.pendingInterestedUsers.includes(targetUserObjectId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No pending join request');
  }
  event.pendingInterestedUsers = event.pendingInterestedUsers.filter(
    id => !id.equals(targetUserObjectId)
  );
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
  if (
    !event.interestedUsers.includes(targetUserObjectId) &&
    !event.pendingInterestedUsers.includes(targetUserObjectId)
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'User is not interested or pending in event'
    );
  }
  event.interestedUsers = event.interestedUsers.filter(
    id => !id.equals(targetUserObjectId)
  );
  event.pendingInterestedUsers = event.pendingInterestedUsers.filter(
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
  if (!event.interestedUsers.includes(targetUserObjectId)) {
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
  const event = await Event.findById(eventId)
    .populate([
      {
        path: 'creatorId',
        select: 'fullName  profileImage username createdAt description',
      },
      {
        path: 'coHosts',
        select: 'fullName  profileImage username',
      },
      {
        path: 'interestedUsers',
        select: 'fullName  profileImage username',
      },
      {
        path: 'pendingInterestedUsers',
        select: 'fullName  profileImage username',
      },
    ])
    .select('-isDeleted -createdAt -updatedAt -__v');
  if (!event || event.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
  }
  if (
    event.privacy === EventPrivacy.PRIVATE &&
    !event.interestedUsers.includes(new Types.ObjectId(userId)) &&
    !event.pendingInterestedUsers.includes(new Types.ObjectId(userId)) &&
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
  const newDate = new Date();
  const query = {
    ...filters,
    isDeleted: false,
    $or: [{ creatorId: new Types.ObjectId(userId) }],
    // filter by startDate and endDate
    startDate: { $gte: newDate },
    endDate: { $gte: newDate },
  };
  options.populate = [
    {
      path: 'creatorId',
      select: 'fullName username profileImage',
    },
  ];
  options.select =
    'eventName eventImage creatorId interestCount startDate endDate ';
  options.sortBy = options.sortBy || '-createdAt';
  return Event.paginate(query, options);
};

const getMyInterestedEvents = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IEvent>> => {
  const newDate = new Date();
  const query = {
    ...filters,
    isDeleted: false,
    creatorId: { $ne: new Types.ObjectId(userId) },
    $or: [{ interestedUsers: { $in: [new Types.ObjectId(userId)] } }],
    startDate: { $gte: newDate },
    endDate: { $gte: newDate },
  };
  options.populate = [
    {
      path: 'creatorId',
      select: 'fullName username profileImage',
    },
  ];
  options.select =
    'eventName eventImage creatorId interestCount startDate endDate ';
  options.sortBy = options.sortBy || '-createdAt';
  return Event.paginate(query, options);
};

const getEventSuggestions = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IEvent>> => {
  const newDate = new Date();
  const query = {
    isDeleted: false,
    privacy: EventPrivacy.PUBLIC,
    interestedUsers: { $nin: [new Types.ObjectId(userId)] },
    pendingInterestedUsers: { $nin: [new Types.ObjectId(userId)] },
    creatorId: { $ne: new Types.ObjectId(userId) },
    coHosts: { $nin: [new Types.ObjectId(userId)] },
    startDate: { $gte: newDate },
    endDate: { $gte: newDate },
  };
  options.populate = [
    {
      path: 'creatorId',
      select: 'fullName username profileImage',
    },
  ];
  options.select =
    'eventName eventImage creatorId interestCount startDate endDate ';
  options.sortBy = options.sortBy || '-createdAt';
  const events = await Event.paginate(query, options);
  return events;
};

export const EventService = {
  createEvent,
  interestEvent,
  notInterestEvent,
  getEvent,
  deleteEvent,
  getMyEvents,
  getMyInterestedEvents,
  getEventSuggestions,
};
