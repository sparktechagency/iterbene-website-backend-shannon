import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';
import { Types } from 'mongoose';
import { ItineraryService } from './itinerary.service';

const createItinerary = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const payload = req.body;

  const result = await ItineraryService.createItinerary(
    new Types.ObjectId(userId),
    payload
  );

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Itinerary created successfully',
    data: result,
  });
});

const getItinerary = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await ItineraryService.getItinerary(id);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Itinerary retrieved successfully',
    data: result,
  });
});

const getUserItineraries = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const options = pick(req.query, ['page', 'limit']);

  const result = await ItineraryService.getUserItineraries(
    userId,
    parseInt(options.page as string) || 1,
    parseInt(options.limit as string) || 10
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User itineraries retrieved successfully',
    data: result,
  });
});

export { createItinerary, getItinerary, getUserItineraries };
