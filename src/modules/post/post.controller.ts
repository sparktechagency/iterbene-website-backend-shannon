import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';
import { Types } from 'mongoose';
import { MediaType } from '../media/media.interface';
import { PostServices } from './post.services';
import { PostType } from './post.interface';

const createPost = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filesObject = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const files = Object.values(filesObject).flat();
  const {
    content,
    itineraryId,
    postType,
    privacy,
    sourceId,
    visitedLocationName,
  } = req.body;

  let visitedLocation = req.body.visitedLocation;
  if (typeof visitedLocation === 'string') {
    try {
      visitedLocation = JSON.parse(visitedLocation);
    } catch (error) {
      return sendResponse(res, {
        code: StatusCodes.BAD_REQUEST,
        message: 'Invalid JSON format for visitedLocation',
        data: null,
      });
    }
  } else {
    console.log('visitedLocation is not a string:', visitedLocation);
  }

  const result = await PostServices.createPost({
    userId,
    content,
    files,
    itineraryId,
    postType,
    privacy,
    sourceId,
    visitedLocation, // Pass the parsed or original value
    visitedLocationName,
  });

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Post created successfully',
    data: result,
  });
});

const sharePost = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { originalPostId, content, privacy } = req.body;

  const result = await PostServices.sharePost({
    userId: new Types.ObjectId(userId),
    originalPostId,
    content,
    privacy,
  });

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Post shared successfully',
    data: result,
  });
});

const getPosts = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, [
    'mediaType',
    'hashtag',
    'itinerary',
    'postType',
    'userId',
  ]);
  const options = pick(req.query, ['page', 'limit']);

  const result = await PostServices.getPosts(
    {
      mediaType: filter.mediaType as MediaType,
      hashtag: filter.hashtag as string,
      itinerary: filter.itinerary === 'true',
      postType: filter.postType as PostType,
      userId: filter.userId as string,
    },
    {
      page: parseInt(options.page as string) || 1,
      limit: parseInt(options.limit as string) || 10,
    }
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Posts retrieved successfully',
    data: result,
  });
});

const getPostsByHashtag = catchAsync(async (req: Request, res: Response) => {
  const { hashtag } = req.params;
  const options = pick(req.query, ['page', 'limit']);

  const result = await PostServices.getPostsByHashtag(
    hashtag,
    parseInt(options.page as string) || 1,
    parseInt(options.limit as string) || 10
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Posts by hashtag retrieved successfully',
    data: result,
  });
});

export const PostController = {
  createPost,
  sharePost,
  getPosts,
  getPostsByHashtag,
};
