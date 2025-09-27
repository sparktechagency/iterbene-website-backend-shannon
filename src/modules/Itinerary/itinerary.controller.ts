import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';
import { ItineraryService } from './itinerary.service';
import ApiError from '../../errors/ApiError';
import { uploadFilesToS3 } from '../../helpers/s3Service';
import { ITINERARY_UPLOADS_FOLDER } from './itinerary.constant';

const createItineraryFromPDF = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user;
    if (!req.file) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'PDF file is required');
    }
    const fileUrl = await uploadFilesToS3([req.file], ITINERARY_UPLOADS_FOLDER);
    const result = await ItineraryService.createItineraryFromPDF(
      userId,
      fileUrl[0]
    );
    sendResponse(res, {
      code: StatusCodes.CREATED,
      message: 'Itinerary created successfully',
      data: result,
    });
  }
);

const createItinerary = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const payload = req.body;

  const result = await ItineraryService.createItinerary(userId, payload);

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Itinerary created successfully',
    data: result,
  });
});

const getItinerary = catchAsync(async (req: Request, res: Response) => {
  const { itineraryId } = req.params;
  const result = await ItineraryService.getItinerary(itineraryId);

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

const updateItinerary = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { itineraryId } = req.params;
  const payload = req.body;

  const result = await ItineraryService.updateItinerary(
    userId,
    itineraryId,
    payload
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Itinerary updated successfully',
    data: result,
  });
});

export const ItineraryController = {
  createItineraryFromPDF,
  createItinerary,
  getItinerary,
  getUserItineraries,
  updateItinerary,
};
