import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import { EventService } from './event.services';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';
import { uploadFilesToS3 } from '../../helpers/s3Service';
import { EVENT_UPLOADS_FOLDER } from './event.constant';

const createEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req?.user;
  const file = req?.file as Express.Multer.File;
  const payload = req?.body;
  // parse the JSON string location and coleaders
  if (typeof req?.body?.location === 'string') {
    req.body.location = JSON.parse(req?.body?.location);
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

const interestEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId } = req.params;
  const result = await EventService.interestEvent(userId, eventId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event interested successfully',
    data: result,
  });
});

const notInterestEvent = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId } = req.params;
  const result = await EventService.notInterestEvent(userId, eventId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event not interested successfully',
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
  const filters = pick(req.query, ['name',"userId"]);
  const options = pick(req.query, ['limit', 'skip', 'sortBy']);
  const result = await EventService.getEventSuggestions(
    filters,
    options
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event suggestions retrieved successfully',
    data: result,
  });
});

export const EventController = {
  createEvent,
  interestEvent,
  notInterestEvent,
  getEvent,
  deleteEvent,
  getMyEvents,
  getMyInterestedEvents,
  getEventSuggestions,
};
