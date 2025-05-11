import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { BlockedUser } from './blockedUsers.model';
import { Connections } from '../connections/connections.model';
import { Follower } from '../followers/followers.model';
import { validateUsers } from '../../utils/validateUsers';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { IBlockedUser } from './blockedUsers.interface';

const blockUser = async (blockerId: string, blockedId: string) => {
  await validateUsers(blockerId, blockedId, 'Block');

  const existingBlock = await BlockedUser.findOne({
    blockerId,
    blockedId,
  });
  if (existingBlock) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is already blocked');
  }

  const newBlock = new BlockedUser({
    blockerId,
    blockedId,
  });
  await newBlock.save();

  await Connections.deleteMany({
    $or: [
      { sentBy: blockerId, receivedBy: blockedId },
      { sentBy: blockedId, receivedBy: blockerId },
    ],
  });
  await Follower.deleteMany({
    $or: [
      { followerId: blockerId, followedId: blockedId },
      { followerId: blockedId, followedId: blockerId },
    ],
  });

  return newBlock;
};

const unblockUser = async (blockerId: string, blockedId: string) => {
  const result = await BlockedUser.deleteOne({
    blockerId,
    blockedId,
  });
  if (result.deletedCount === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Block relationship not found');
  }

  return result;
};

const getBlockedUsers = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IBlockedUser>> => {
  filters.blockerId = filters.userId;
  options.populate = [
    {
      path: 'blockedId',
      select: 'username profileImage',
    },
  ];
  options.sortBy = options.sortBy || '-createdAt';
  return await BlockedUser.paginate(filters, options);
};

export const BlockedUserService = {
  blockUser,
  unblockUser,
  getBlockedUsers,
};
