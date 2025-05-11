import { StatusCodes } from 'http-status-codes';
import { User } from '../modules/user/user.model';
import ApiError from '../errors/ApiError';
import { BlockedUser } from '../modules/blockedUsers/blockedUsers.model';

export const validateUsers = async (userId1: string, userId2: string, action: string) => {
  const user1 = await User.findById(userId1);
  const user2 = await User.findById(userId2);
  if (!user1 || user1.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, `${action} initiator user not found`);
  }
  if (!user2 || user2.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, `${action} target user not found`);
  }
  if (userId1 === userId2) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `You cannot ${action.toLowerCase()} yourself`);
  }
  const isBlocked = await BlockedUser.findOne({
    $or: [
      { blockerId: userId1, blockedId: userId2 },
      { blockerId: userId2, blockedId: userId1 },
    ],
  });
  if (isBlocked) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Cannot ${action.toLowerCase()} blocked user`);
  }
  return { user1, user2 };
};