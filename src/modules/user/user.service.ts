import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { TUser } from './user.interface';
import { User } from './user.model';
import { sendAdminOrSuperAdminCreationEmail } from '../../helpers/emailService';
import { Types } from 'mongoose';

interface IAdminOrSuperAdminPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
  message?: string;
}

const createAdminOrSuperAdmin = async (
  payload: IAdminOrSuperAdminPayload
): Promise<TUser> => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exists.');
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  if (!passwordRegex.test(payload.password)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters.'
    );
  }

  const result = new User({
    fullName: payload.fullName,
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    password: payload.password,
    role: payload.role,
    isEmailVerified: true,
  });

  await result.save();
  await sendAdminOrSuperAdminCreationEmail(
    payload.email,
    payload.role,
    payload.password,
    payload.message
  );
  return result;
};

const getSingleUser = async (userId: string): Promise<TUser | null> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const result = await User.findById(userId);
  if (!result || result.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  return result;
};

const setUserLatestLocation = async (
  userId: string,
  payload: { latitude: number; longitude: number }
): Promise<TUser | null> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const updatedData = {
    location: {
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
  };
  const user = await User.findByIdAndUpdate(userId, updatedData, {
    new: true,
    runValidators: true,
  });
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  return user;
};

const updateMyProfile = async (userId: string, payload: Partial<TUser>) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  if (payload.email && payload.email !== user.email) {
    const existingEmail = await User.findOne({ email: payload.email });
    if (existingEmail) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already in use.');
    }
    user.isEmailVerified = false;
  }
  Object.assign(user, payload);
  await user.save();
  return user;
};

const updateUserStatus = async (
  userId: string,
  payload: 'banned' | 'unbanned' | 'blocked' | 'unblocked' | 'deleted'
): Promise<TUser | null> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  if (payload === 'banned') {
    user.isBanned = true;
    user.status = 'Banned';
    user.banUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  } else if (payload === 'unbanned') {
    user.isBanned = false;
    user.status = 'Active';
    user.banUntil = undefined;
  } else if (payload === 'blocked') {
    user.isBlocked = true;
    user.status = 'Block';
  } else if (payload === 'unblocked') {
    user.isBlocked = false;
    user.status = 'Active';
  } else if (payload === 'deleted') {
    user.isDeleted = true;
    user.status = 'Delete';
  }
  await user.save();
  return user;
};

const getMyProfile = async (userId: string): Promise<TUser | null> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const result = await User.findById(userId);
  if (!result || result.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  return result;
};

const deleteMyProfile = async (userId: string): Promise<TUser | null> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const result = await User.findById(userId);
  if (!result || result.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  result.isDeleted = true;
  await result.save();
  return result;
};

export const UserService = {
  createAdminOrSuperAdmin,
  getSingleUser,
  setUserLatestLocation,
  updateMyProfile,
  updateUserStatus,
  getMyProfile,
  deleteMyProfile,
};
