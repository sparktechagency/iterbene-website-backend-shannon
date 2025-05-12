import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';
import { HashtagService } from './hashtag.service';

const getTrendingHashtags = catchAsync(async (req: Request, res: Response) => {
  const { limit } = pick(req.query, ['limit']);

  const result = await HashtagService.getTrendingHashtags(
    parseInt(limit as string) || 10
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Trending hashtags retrieved successfully',
    data: result,
  });
});

const getHashtagPosts = catchAsync(async (req: Request, res: Response) => {
  const { hashtag } = req.params;
  const options = pick(req.query, ['page', 'limit']);

  const result = await HashtagService.getHashtagPosts(
    hashtag,
    parseInt(options.page as string) || 1,
    parseInt(options.limit as string) || 10
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Hashtag posts retrieved successfully',
    data: result,
  });
});

export { getTrendingHashtags, getHashtagPosts };
