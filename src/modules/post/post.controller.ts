import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../shared/pick';
import { Types } from 'mongoose';
import { MediaType } from '../media/media.interface';
import { PostServices } from './post.services';
import { PostType } from './post.interface';
import ApiError from '../../errors/ApiError';

// Create a new post
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
  }

  const result = await PostServices.createPost({
    userId,
    content,
    files,
    itineraryId,
    postType,
    privacy,
    sourceId,
    visitedLocation,
    visitedLocationName,
  });

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Post created successfully',
    data: result,
  });
});

// Update an existing post
const updatePost = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { postId } = req.params;
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
  }

  const result = await PostServices.updatePost(postId, {
    userId,
    content,
    files,
    itineraryId,
    postType,
    privacy,
    sourceId,
    visitedLocation,
    visitedLocationName,
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Post updated successfully',
    data: result,
  });
});

// Share an existing post
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

// Add or remove a reaction on a post
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

// Add or remove a reaction on a comment
const addOrRemoveCommentReaction = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user;
    const { postId, commentId, reactionType } = req.body;

    const result = await PostServices.addOrRemoveCommentReaction({
      userId: new Types.ObjectId(userId),
      postId,
      commentId,
      reactionType,
    });

    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Comment reaction updated successfully',
      data: result,
    });
  }
);

//create a comment on a post
const createComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { postId, comment, replyTo, parentCommentId, mentions } = req.body;

  if (!postId || !comment) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Post ID and comment are required'
    );
  }
  const payload = {
    userId: new Types.ObjectId(userId),
    postId,
    comment,
    replyTo,
    parentCommentId,
    mentions,
  };
  const result = await PostServices.createComment(payload);

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Comment created successfully',
    data: result,
  });
});

// Update an existing comment
const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { commentId } = req.params;
  const { postId, comment, mentions } = req.body;

  if (!postId || !commentId || !comment) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Post ID, comment ID, and comment are required'
    );
  }

  const payload = {
    userId: new Types.ObjectId(userId),
    postId,
    commentId,
    comment,
    mentions,
  };

  const result = await PostServices.updateComment(payload);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Comment updated successfully',
    data: result,
  });
});

// Delete a comment
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

// Get feed posts with filters and pagination
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

// Get a post by ID
const getPostById = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const result = await PostServices.getPostById(postId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Post retrieved successfully',
    data: result,
  });
});

// Get user timeline posts
const getUserTimelinePosts = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { username } = req.params;
  const filter = pick(req.query, ['mediaType']);
  const options = pick(req.query, ['page', 'limit', 'populate', 'sortBy']);
  filter.userId = userId;
  filter.username = username;
  const result = await PostServices.getUserTimelinePosts(filter, options);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Timeline posts retrieved successfully',
    data: result,
  });
});

// Get group posts
const getGroupPosts = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { groupId } = req.params;
  const filters = pick(req.query, ['mediaType']);
  const options = pick(req.query, ['page', 'limit']);
  filters.userId = userId;
  filters.groupId = groupId;
  const result = await PostServices.getGroupPosts(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group posts retrieved successfully',
    data: result,
  });
});

// Get event posts
const getEventPosts = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { eventId } = req.params;
  const filters = pick(req.query, ['mediaType']);
  const options = pick(req.query, ['page', 'limit']);

  filters.userId = userId;
  filters.eventId = eventId;
  const result = await PostServices.getEventPosts(filters, options);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Event posts retrieved successfully',
    data: result,
  });
});

// Delete a post
const deletePost = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { postId } = req.params;

  const result = await PostServices.deletePost(userId, postId);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Post deleted successfully',
    data: result,
  });
});

// Get visited posts with distance
const getVisitedPostsWithDistance = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user;
    const options = pick(req.query, ['page', 'limit']);
    const result = await PostServices.getVisitedPostsWithDistance(
      userId,
      options
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Visited posts retrieved successfully',
      data: result,
    });
  }
);

// Increment itinerary view count
const incrementItineraryViewCount = catchAsync(
  async (req: Request, res: Response) => {
    const { postId, itineraryId } = req.body;
    const result = await PostServices.incrementItineraryViewCount(
      postId,
      itineraryId
    );
    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Itinerary view count incremented successfully',
      data: result,
    });
  }
);
export const PostController = {
  createPost,
  sharePost,
  feedPosts,
  getUserTimelinePosts,
  getGroupPosts,
  getEventPosts,
  addOrRemoveReaction,
  addOrRemoveCommentReaction,
  getPostById,
  updatePost,
  createComment,
  updateComment,
  deletePost,
  deleteComment,
  getVisitedPostsWithDistance,
  incrementItineraryViewCount,
};
