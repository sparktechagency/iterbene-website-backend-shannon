import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import { EventService } from './event.services';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';
import { uploadFilesToS3 } from '../../helpers/s3Service';
import { EVENT_UPLOADS_FOLDER } from './event.constant';

const createEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const file = req.file as Express.Multer.File;
  const payload = req.body;
  // parse the JSON string location and coleaders
  if (typeof req.body.location === 'string') {
    req.body.location = JSON.parse(req.body.location);
  }
  if (typeof req.body.duration === 'string') {
    req.body.duration = JSON.parse(req.body.duration);
  }
  const eventImage = await uploadFilesToS3([file], EVENT_UPLOADS_FOLDER);
  payload.eventImage = eventImage[0];
  const result = await EventService.createEvent(userId, payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event created successfully',
    data: result,
  });
});

const joinEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId } = req.body;
  const result = await EventService.joinEvent(userId, eventId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Join request sent successfully',
    data: result,
  });
});

const leaveEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId } = req.body;
  const result = await EventService.leaveEvent(userId, eventId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Left event successfully',
    data: result,
  });
});

const approveJoinEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId, userId: targetUserId } = req.body;
  const result = await EventService.approveJoinEvent(
    userId,
    eventId,
    targetUserId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Join request approved successfully',
    data: result,
  });
});

const rejectJoinEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId, userId: targetUserId } = req.body;
  const result = await EventService.rejectJoinEvent(
    userId,
    eventId,
    targetUserId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Join request rejected successfully',
    data: result,
  });
});

const removeUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId, userId: targetUserId } = req.body;
  const result = await EventService.removeUser(userId, eventId, targetUserId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User removed successfully',
    data: result,
  });
});

const promoteToCoHost = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId, userId: targetUserId } = req.body;
  const result = await EventService.promoteToCoHost(
    userId,
    eventId,
    targetUserId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User promoted to co-host successfully',
    data: result,
  });
});

const demoteCoHost = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId, coHostId } = req.body;
  const result = await EventService.demoteCoHost(userId, eventId, coHostId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Co-host demoted successfully',
    data: result,
  });
});

const getEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { id } = req.params;
  const result = await EventService.getEvent(id, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event retrieved successfully',
    data: result,
  });
});

const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { id } = req.params;
  const payload = req.body;
  const result = await EventService.updateEvent(userId, id, payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event updated successfully',
    data: result,
  });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { id } = req.params;
  const result = await EventService.deleteEvent(userId, id);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event deleted successfully',
    data: result,
  });
});

const getMyEvents = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['name']);
  const options = pick(req.query, ['limit', 'page', 'sortBy']);
  const result = await EventService.getMyEvents(userId, filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'My events retrieved successfully',
    data: result,
  });
});

const getMyInterestedEvents = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user;
    const filters = pick(req.query, ['name']);
    const options = pick(req.query, ['limit', 'page', 'sortBy']);
    const result = await EventService.getMyInterestedEvents(
      userId,
      filters,
      options
    );
    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Interested events retrieved successfully',
      data: result,
    });
  }
);

const getEventSuggestions = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { limit = 10, skip = 0, sortBy } = req.query;
  const result = await EventService.getEventSuggestions(userId, Number(limit), {
    skip: Number(skip),
    sortBy: sortBy as string,
  });
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event suggestions retrieved successfully',
    data: result,
  });
});

export const EventController = {
  createEvent,
  joinEvent,
  leaveEvent,
  approveJoinEvent,
  rejectJoinEvent,
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
