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
    userId,
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

const addOrRemoveReaction = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { postId, reactionType } = req.body;

  const result = await PostServices.addOrRemoveReaction({
    userId: new Types.ObjectId(userId),
    postId,
    reactionType,
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Reaction updated successfully',
    data: result,
  });
});

const createComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { postId, comment, replyTo, parentCommentId } = req.body;

  const result = await PostServices.createComment({
    userId: new Types.ObjectId(userId),
    postId,
    comment,
    replyTo,
    parentCommentId,
  });

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Comment created successfully',
    data: result,
  });
});

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { commentId } = req.params;
  const { postId, comment } = req.body;

  const result = await PostServices.updateComment({
    userId: new Types.ObjectId(userId),
    postId,
    commentId,
    comment,
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Comment updated successfully',
    data: result,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { commentId } = req.params;
  const { postId } = req.body;

  const result = await PostServices.deleteComment({
    userId: new Types.ObjectId(userId),
    postId,
    commentId,
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Comment deleted successfully',
    data: result,
  });
});

const feedPosts = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, [
    'mediaType',
    'hashtag',
    'itinerary',
    'postType',
    'userId',
  ]);
  const options = pick(req.query, ['page', 'limit']);

  const result = await PostServices.feedPosts(
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

const getTimelinePosts = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['userId']);
  const options = pick(req.query, ["page", "limit"]);

  const result = await PostServices.getTimelinePosts(filter, options);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Timeline posts retrieved successfully',
    data: result,
  });
});

const getGroupPosts = catchAsync(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const options = pick(req.query, ['page', 'limit']);

  const result = await PostServices.getGroupPosts(
    { groupId },
    {
      page: parseInt(options.page as string) || 1,
      limit: parseInt(options.limit as string) || 10,
    }
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group posts retrieved successfully',
    data: result,
  });
});

const getEventPosts = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const options = pick(req.query, ['page', 'limit']);

  const result = await PostServices.getEventPosts(
    { eventId },
    {
      page: parseInt(options.page as string) || 1,
      limit: parseInt(options.limit as string) || 10,
    }
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event posts retrieved successfully',
    data: result,
  });
});

export const PostController = {
  createPost,
  sharePost,
  feedPosts,
  getTimelinePosts,
  getGroupPosts,
  getEventPosts,
  addOrRemoveReaction,
  createComment,
  updateComment,
  deleteComment,
};
