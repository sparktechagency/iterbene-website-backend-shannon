import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { Follower } from './followers.model';
import { validateUsers } from '../../utils/validateUsers';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { IFollower } from './followers.interface';

const followUser = async (followerId: string, followedId: string) => {
  await validateUsers(followerId, followedId, 'Follow');

  const existingFollow = await Follower.findOne({
    followerId,
    followedId,
  });
  if (existingFollow) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are already following this user'
    );
  }

  const newFollow = new Follower({
    followerId,
    followedId,
  });
  await newFollow.save();
  return newFollow;
};

const unfollowUser = async (followerId: string, followedId: string) => {
  const result = await Follower.deleteOne({
    followerId,
    followedId,
  });
  if (result.deletedCount === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Follow relationship not found');
  }

  return result;
};

const getFollowers = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IFollower>> => {
  filters.followedId = filters.userId;
  options.populate = [
    {
      path: 'followerId',
      select: 'username profileImage',
    },
  ];
  options.sortBy = options.sortBy || '-createdAt';
  return await Follower.paginate(filters, options);
};

const getFollowing = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IFollower>> => {
  filters.followerId = filters.userId;
  options.populate = [
    {
      path: 'followedId',
      select: 'username profileImage',
    },
  ];
  options.sortBy = options.sortBy || '-createdAt';
  return await Follower.paginate(filters, options);
};

export const FollowerService = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
};
