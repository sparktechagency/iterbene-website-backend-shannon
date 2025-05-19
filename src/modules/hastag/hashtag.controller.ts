import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';
import { HashtagService } from './hashtag.service';

const getTrendingHashtags = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ['limit']);
  const result = await HashtagService.getTrendingHashtags(
    parseInt(options.limit as string) || 10
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Hashtags fetched successfully',
    data: result,
  });
});
const getHashtags = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm']);
  const options = pick(req.query, ['page','limit','populate','sortBy']);
  const result = await HashtagService.getHashtags(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Hashtags fetched successfully',
    data: result,
  });
});
const getHashtagPosts = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['hashtag']);
  const options = pick(req.query, ['page','limit','populate','sortBy']);
  const result = await HashtagService.getHashtagPosts(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Hashtag posts fetched successfully',
    data: result,
  });
});
export const HashtagController = {
  getTrendingHashtags,
  getHashtags,
  getHashtagPosts,
};