import { Request, Response } from 'express';
import { BlockedUserService } from './blockedUsers.service';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import pick from '../../shared/pick';

const blockUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { blockedId } = req.params;
  const result = await BlockedUserService.blockUser(userId, blockedId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User blocked successfully',
    data: result,
  });
});

const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { blockedId } = req.params;
  const result = await BlockedUserService.unblockUser(userId, blockedId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User unblocked successfully',
    data: result,
  });
});

const getBlockedUsers = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const filters = pick(req.query, ['fullName']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.userId = userId;
  const result = await BlockedUserService.getBlockedUsers(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Blocked users retrieved successfully',
    data: result,
  });
});

export const BlockedUserController = {
  blockUser,
  unblockUser,
  getBlockedUsers,
};
