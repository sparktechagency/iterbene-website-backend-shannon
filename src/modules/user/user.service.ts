import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { ConnectionPrivacy, PrivacyVisibility, TUser } from './user.interface';
import { User } from './user.model';
import { sendAdminOrSuperAdminCreationEmail } from '../../helpers/emailService';
import { Types } from 'mongoose';
import { Connections } from '../connections/connections.model';
import { ConnectionStatus } from '../connections/connections.interface';

interface IAdminOrSuperAdminPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
  message?: string;
}

// Helper function to filter user fields based on privacy settings
const filterUserFields = async (
  user: TUser,
  requesterId?: string | null
): Promise<Partial<TUser>> => {
  const isSelf = requesterId === user._id.toString();
  let isFriend = false;
  if (requesterId) {
    const existingConnection = await Connections.exists({
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
    if (existingConnection) {
      isFriend = true;
    }
  }

  const filteredUser: Record<string, any> = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    profileImage: user.profileImage,
    coverImage: user.coverImage,
    email: user.email,
    referredAs: user.referredAs,
    address: user.address,
    isOnline: user.isOnline,
    privacySettings: user.privacySettings,
    createdAt: user.createdAt,
  };

  const privateFields: (keyof TUser)[] = [
    'phoneNumber',
    'email',
    'address',
    'ageRange',
    'nickname',
    'gender',
    'location',
    'locationName',
    'city',
    'country',
    'state',
    'profession',
    'description',
    'phoneNumber',
    'privacySettings',
    'maritalStatus',
  ];

  privateFields?.forEach(field => {
    const visibility =
      user.privacySettings[field as keyof typeof user.privacySettings];
    if (
      isSelf ||
      visibility === PrivacyVisibility.PUBLIC ||
      (visibility === PrivacyVisibility.FRIENDS && isFriend)
    ) {
      (filteredUser as Partial<Record<keyof TUser, any>>)[field] = user[field];
    }
  });

  //followers count
  const followersCount = await Connections.countDocuments({
    receivedBy: user._id,
    status: ConnectionStatus.ACCEPTED,
  });
  //following count
  const followingCount = await Connections.countDocuments({
    sentBy: user._id,
    status: ConnectionStatus.ACCEPTED,
  });
  filteredUser.followersCount = followersCount;
  filteredUser.followingCount = followingCount;

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
    firstName: payload.firstName,
    lastName: payload.lastName,
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
  userName: string,
  requesterId?: string
): Promise<Partial<TUser> | null> => {
  const user = await User.findOne({
    username: userName,
    isDeleted: false,
  }).select(
    '-password -isBlocked -isResetPassword -failedLoginAttempts -lockUntil -lastPasswordChange -passwordHistory -banUntil -isBanned -isDeleted -__v'
  );
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  return filterUserFields(user, requesterId as string);
};

const getSingleUserByUser = async (
  userId: string,
  requesterId?: string
): Promise<Partial<TUser> | null> => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select(
    '-password -isBlocked -isResetPassword -failedLoginAttempts -lockUntil -lastPasswordChange -passwordHistory -banUntil -isBanned -isDeleted -__v'
  );
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  return filterUserFields(user, requesterId as string);
};

const setUserLatestLocation = async (
  userId: string,
  payload: {
    latitude: number;
    longitude: number;
    locationName: string;
    city?: string;
    state?: string;
    country?: string;
  }
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
    city: payload.city,
    state: payload.state,
    country: payload.country,
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

const updateProfileImage = async (userId: string, profileImage: string) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  user.profileImage = profileImage;
  await user.save();
  return filterUserFields(user, userId);
};

const updateCoverImage = async (userId: string, coverImage: string) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  user.coverImage = coverImage;
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

const updatePrivacySettings = async (
  userId: string,
  payload: Partial<TUser['privacySettings']>
) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  user.privacySettings = {
    ...user.privacySettings,
    ...payload,
  };
  await user.save();
  return filterUserFields(user, userId);
};

export const UserService = {
  createAdminOrSuperAdmin,
  getSingleUser,
  setUserLatestLocation,
  updateProfileImage,
  updateCoverImage,
  updateMyProfile,
  getSingleUserByUser,
  checkUserNameAlreadyExists,
  updateUserStatus,
  getMyProfile,
  deleteMyProfile,
  filterUserFields,
  updatePrivacySettings,
};
