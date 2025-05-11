import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { ConnectionPrivacy, PrivacyVisibility, TUser } from './user.interface';
import { User } from './user.model';
import { sendAdminOrSuperAdminCreationEmail } from '../../helpers/emailService';
import { Types } from 'mongoose';
import { Connections } from '../connections/connections.model';
import { ConnectionStatus } from '../connections/connections.interface';

interface IAdminOrSuperAdminPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
  message?: string;
}

// Helper function to filter user fields based on privacy settings
export const filterUserFields = async (
  user: TUser,
  requesterId: string | null // null if fetching own profile
): Promise<Partial<TUser>> => {
  const isSelf = requesterId === user._id.toString();
  let isFriend = false;

  if (requesterId && !isSelf) {
    const connection = await Connections.findOne({
      $or: [
        {
          sentBy: requesterId,
          receivedBy: user._id,
          status: ConnectionStatus.ACCEPTED,
        },
        {
          sentBy: user._id,
          receivedBy: requesterId,
          status: ConnectionStatus.ACCEPTED,
        },
      ],
    });
    isFriend = !!connection;
  }

  const filteredUser: Partial<TUser> = {
    _id: user._id,
    username: user.username,
    profileImage: user.profileImage,
    coverImage: user.coverImage,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isOnline: user.isOnline,
  };

  const privateFields: (keyof TUser)[] = [
    'age',
    'nickname',
    'gender',
    'location',
    'locationName',
    'city',
    'profession',
    'aboutMe',
    'phoneNumber',
    'maritalStatus',
  ];

  privateFields.forEach(field => {
    const visibility = user.privacySettings[field as keyof typeof user.privacySettings];
    if (
      isSelf ||
      visibility === PrivacyVisibility.PUBLIC ||
      (visibility === PrivacyVisibility.FRIENDS && isFriend)
    ) {
      (filteredUser as Partial<Record<keyof TUser, any>>)[field] = user[field];
    }
  });

  return filteredUser;
};

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

const getSingleUser = async (
  userId: string,
  requesterId: string
): Promise<Partial<TUser> | null> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const user = await User.findById(userId).select(
    '-password -isBlocked -isResetPassword -failedLoginAttempts -lockUntil -lastPasswordChange -passwordHistory -banUntil -isBanned -isDeleted -__v'
  );
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  return filterUserFields(user, requesterId);
};

const setUserLatestLocation = async (
  userId: string,
  payload: { latitude: number; longitude: number; locationName: string }
) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const updatedData = {
    location: {
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
    locationName: payload.locationName,
  };
  const user = await User.findByIdAndUpdate(userId, updatedData, {
    new: true,
    runValidators: true,
  }).select(
    '-password -isBlocked -isResetPassword -failedLoginAttempts -lockUntil -lastPasswordChange -passwordHistory -banUntil -isBanned -isDeleted -__v'
  );
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  return filterUserFields(user, userId);
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
  if (payload.privacySettings) {
    const validFields = [
      'age',
      'nickname',
      'gender',
      'location',
      'locationName',
      'city',
      'profession',
      'aboutMe',
      'phoneNumber',
      'maritalStatus',
    ];
    for (const field of Object.keys(payload.privacySettings)) {
      if (!validFields.includes(field)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Invalid privacy field: ${field}`
        );
      }
      if (
        !Object.values(PrivacyVisibility).includes(
          payload.privacySettings[field as keyof typeof payload.privacySettings]
        )
      ) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Invalid visibility for ${field}`
        );
      }
    }
  }
  if (
    payload.connectionPrivacy &&
    !Object.values(ConnectionPrivacy).includes(payload.connectionPrivacy)
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid connection privacy setting'
    );
  }
  Object.assign(user, payload);
  await user.save();
  return filterUserFields(user, userId);
};

const checkUserNameAlreadyExists = async (
  userName: string
): Promise<boolean> => {
  const user = await User.findOne({ username: userName }).select('_id');
  return !!user;
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
    user.banUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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

const getMyProfile = async (userId: string): Promise<Partial<TUser> | null> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const user = await User.findById(userId).select(
    '-password -isBlocked -isResetPassword -failedLoginAttempts -lockUntil -lastPasswordChange -passwordHistory -banUntil -isBanned -isDeleted -__v'
  );
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  return filterUserFields(user, userId);
};

const deleteMyProfile = async (userId: string): Promise<TUser | null> => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID.');
  }
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  user.isDeleted = true;
  await user.save();
  return user;
};

export const UserService = {
  createAdminOrSuperAdmin,
  getSingleUser,
  setUserLatestLocation,
  updateMyProfile,
  checkUserNameAlreadyExists,
  updateUserStatus,
  getMyProfile,
  deleteMyProfile,
  filterUserFields,
};
