import { Request, Response } from 'express';
import { FollowerService } from './followers.service';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import pick from '../../shared/pick';

const followUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user; // Assuming auth middleware sets req.user
  const { followedId } = req.body;
  const result = await FollowerService.followUser(userId, followedId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User followed successfully',
    data: result,
  });
});

const unfollowUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { followedId } = req.body;
  const result = await FollowerService.unfollowUser(userId, followedId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User unfollowed successfully',
    data: result,
  });
});

const getFollowers = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['firstName', 'lastName', 'email']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.userId = userId;
  const result = await FollowerService.getFollowers(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Followers retrieved successfully',
    data: result,
  });
});

const getFollowing = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['firstName', 'lastName', 'email']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.userId = userId;
  const result = await FollowerService.getFollowing(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Following retrieved successfully',
    data: result,
  });
});

export const FollowerController = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
};
