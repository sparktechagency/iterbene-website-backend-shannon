import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { StoryService } from './story.service';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';

const createStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filesObject = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };
  const files = Object.values(filesObject).flat();
  const result = await StoryService.createStory(userId, req.body, files);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story created successfully',
    data: result,
  });
});

const getStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { storyId } = req.params;
  const result = await StoryService.getStory(storyId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story retrieved successfully',
    data: result,
  });
});

const deleteStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { storyId } = req.params;
  const result = await StoryService.deleteStory(userId, storyId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story deleted successfully',
    data: result,
  });
});

const viewStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { mediaId } = req.body;
  const result = await StoryService.viewStoryMedia(mediaId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story viewed successfully',
    data: result,
  });
});

const reactToStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { mediaId, reactionType } = req.body;
  const result = await StoryService.reactToStoryMedia(
    mediaId,
    userId,
    reactionType
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Reaction added successfully',
    data: result,
  });
});

const replyToStory = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { mediaId, message } = req.body;
  const result = await StoryService.replyToStoryMedia(mediaId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Reply sent successfully',
    data: result,
  });
});

const getStoryFeed = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['city', 'country', 'ageRange']);
  const options = pick(req.query, ['limit', 'page', 'sortBy']);
  const result = await StoryService.getStoryFeed(userId, filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Story feed retrieved successfully',
    data: result,
  });
});

const getStoryViewers = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { mediaId } = req.params;
  const result = await StoryService.getStoryMediaViewers(userId, mediaId);
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
  getStoryFeed,
  getStoryViewers,
};
