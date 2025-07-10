import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { User } from '../user/user.model';
import SavedPostItinerary from './savedPostItinerary.model';
import { Post } from '../post/post.model';
import { PaginateOptions } from '../../types/paginate';

const addPostItinerary = async (userId: string, postItineraryId: string) => {
  // check if user exist
  const user = await User.findById(userId);
  if (!user || user.isDeleted || user.isBlocked || user.isBanned) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  //   check post itinerary exist
  const postItinerary = await Post.findById(postItineraryId);
  if (!postItinerary || postItinerary.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post itinerary not found');
  }
  const existing = await SavedPostItinerary.findOne({
    userId,
    postItineraryId,
  });
  if (!existing) {
    const savedPostItinerary = await SavedPostItinerary.create({
      userId,
      postItineraryId,
    });
    return savedPostItinerary;
  }
};

const getSavedPostItinerary = async (
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
      select: 'fullName username profileImage',
    },
  ];
  return await SavedPostItinerary.paginate(query, options);
};

const removePostItinerary = async (userId: string, postItineraryId: string) => {
  const savedPostItinerary = await SavedPostItinerary.findOneAndDelete({
    userId,
    postItineraryId,
  });
  return savedPostItinerary;
};

export const SavedPostItineraryService = {
  addPostItinerary,
  getSavedPostItinerary,
  removePostItinerary,
};
