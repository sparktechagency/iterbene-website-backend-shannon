import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { StoryService } from './story.service';
import { PaginateOptions } from '../../types/paginate';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';

const createStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filesObject = req.files as { [fieldname: string]: Express.Multer.File[] };
  const files = Object.values(filesObject).flat();
  const payload = req.body;
  const result = await StoryService.createStory(userId, payload, files);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story created successfully',
    data: result,
  });
});

const getStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { id } = req.params;
  const result = await StoryService.getStory(id, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story retrieved successfully',
    data: result,
  });
});

const deleteStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { id } = req.params;
  const result = await StoryService.deleteStory(userId, id);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story deleted successfully',
    data: result,
  });
});

const viewStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { storyId } = req.body;
  const result = await StoryService.viewStory(userId, storyId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story viewed successfully',
    data: result,
  });
});

const reactToStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { storyId, reactionType } = req.body;
  const result = await StoryService.reactToStory(userId, storyId, reactionType);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Reaction added successfully',
    data: result,
  });
});

const replyToStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { storyId, message } = req.body;
  const result = await StoryService.replyToStory(userId, storyId, message);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Reply sent successfully',
    data: result,
  });
});

const getMyStories = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = req.query;
  const options: PaginateOptions = {
    limit: Number(req.query.limit) || 10,
    page: Number(req.query.page) || 1,
    sortBy: req.query.sortBy as string,
  };
  const result = await StoryService.getMyStories(userId, filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'My stories retrieved successfully',
    data: result,
  });
});

const getStoryFeed = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { city, country, ageRange, limit = 10, page = 1, sortBy } = req.query;
  const options: PaginateOptions = {
    limit: Number(limit),
    page: Number(page),
    sortBy: sortBy as string,
  };
  const filters: {
    city?: string;
    country?: string;
    ageRange?: [number, number];
  } = {};
  if (city) filters.city = city as string;
  if (country) filters.country = country as string;
  if (ageRange)
    filters.ageRange = (ageRange as string).split(',').map(Number) as [
      number,
      number
    ];
  const result = await StoryService.getStoryFeed(userId, filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story feed retrieved successfully',
    data: result,
  });
});

const getStoryViewers = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { id } = req.params;
  const result = await StoryService.getStoryViewers(userId, id);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story viewers retrieved successfully',
    data: result,
  });
});

export const StoryController = {
  createStory,
  getStory,
  deleteStory,
  viewStory,
  reactToStory,
  replyToStory,
  getMyStories,
  getStoryFeed,
  getStoryViewers,
};
