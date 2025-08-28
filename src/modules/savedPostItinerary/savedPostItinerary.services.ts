import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { User } from '../user/user.model';
import SavedPostItinerary from './savedPostItinerary.model';
import { Post } from '../post/post.model';
import { PaginateOptions } from '../../types/paginate';
const addPostSaved = async (userId: string, postId: string) => {
  // check if user exist
  const user = await User.findById(userId);
  if (!user || user.isDeleted || user.isBlocked || user.isBanned) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  //   check post itinerary exist
  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }
  const existing = await SavedPostItinerary.findOne({
    userId,
    postId,
  });
  if (!existing) {
    const savedPostItinerary = await SavedPostItinerary.create({
      userId,
      postId,
    });
    return savedPostItinerary;
  }
};

const isPostAlreadySaved = async (userId: string, postId: string) => {
  const savedPostItinerary = await SavedPostItinerary.findOne({
    userId,
    postId,
  });
  return !!savedPostItinerary;
};
const getSavedPost = async (
  filters: Record<string, any>,
  options: PaginateOptions
) => {
  const query: Record<string, any> = {
    userId: filters.userId,
  };
  options.populate = [
    { path: 'postId' },
    {
      path: 'userId',
      select: 'firstName lastName username profileImage',
    },
  ];
  return await SavedPostItinerary.paginate(query, options);
};

const removePostSaved = async (userId: string, postId: string) => {
  const savedPostItinerary = await SavedPostItinerary.findOneAndDelete({
    userId,
    postId,
  });
  return savedPostItinerary;
};

export const SavedPostItineraryService = {
  addPostSaved,
getSavedPost,
  removePostSaved,
  isPostAlreadySaved,
};
