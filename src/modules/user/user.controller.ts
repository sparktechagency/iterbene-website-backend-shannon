import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import ApiError from '../../errors/ApiError';
import { UserService } from './user.service';
import { UserInteractionLogService } from '../userInteractionLog/userInteractionLog.service';
import { uploadFile } from '../../helpers/s3Service';

const createAdminOrSuperAdmin = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const superAdmin = await UserService.getSingleUser(userId);
  if (superAdmin?.role !== 'super_admin') {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only super admin can create admin or super admin.'
    );
  }

  const payload = req.body;
  const result = await UserService.createAdminOrSuperAdmin(payload);

  await UserInteractionLogService.createLog(
    result._id,
    'admin_created',
    '/user/admin',
    'POST',
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown',
    { email: payload.email, role: payload.role }
  );

  sendResponse(res, {
    code: StatusCodes.CREATED,
    data: result,
    message: `Admin created successfully with role: ${payload.role}.`,
  });
});

const getSingleUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await UserService.getSingleUser(userId);

  await UserInteractionLogService.createLog(
    req.user?.userId,
    'user_fetched',
    `/user/${userId}`,
    'GET',
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown',
    { userId }
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User fetched successfully.',
  });
});

const setUserLatestLocation = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserService.setUserLatestLocation(userId, req.body);

  await UserInteractionLogService.createLog(
    userId,
    'location_updated',
    '/user/location',
    'POST',
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown',
    { latitude: req.body.latitude, longitude: req.body.longitude }
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User location updated successfully.',
  });
});

const checkUserNameAlreadyExists = catchAsync(async (req, res) => {
  const { userName } = req.params;
  const result = await UserService.checkUserNameAlreadyExists(userName);
  await UserInteractionLogService.createLog(
    req.user?.userId,
    'user_name_checked',
    `/user/check-username/${userName}`,
    'GET',
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown'
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User name checked successfully.',
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const UPLOADS_FOLDER = 'uploads/users';
  // Handle profile picture
  if (files?.profilePicture?.[0]) {
    const profilePictureUrl = await uploadFile(
      files.profilePicture[0],
      UPLOADS_FOLDER
    );
    console.log(profilePictureUrl)
    req.body.profilePicture = profilePictureUrl;
  }

  // Handle cover picture
  if (files?.coverPicture?.[0]) {
    const coverPictureUrl = await uploadFile(
      files.coverPicture[0],
      UPLOADS_FOLDER
    );
    req.body.coverPicture = coverPictureUrl;
  }

  const result = await UserService.updateMyProfile(userId, req.body);

  await UserInteractionLogService.createLog(
    userId,
    'profile_updated',
    '/user/profile',
    'PATCH',
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown',
    req.body
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User profile updated successfully.',
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const result = await UserService.updateUserStatus(userId, status);

  await UserInteractionLogService.createLog(
    req.user?.userId,
    `user_status_${status}`,
    `/user/${userId}/status`,
    'PATCH',
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown',
    { userId, status }
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User status updated successfully.',
  });
});

const getMyProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserService.getMyProfile(userId);

  await UserInteractionLogService.createLog(
    userId,
    'profile_fetched',
    '/user/profile',
    'GET',
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown'
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User profile fetched successfully.',
  });
});

const deleteMyProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserService.deleteMyProfile(userId);

  await UserInteractionLogService.createLog(
    userId,
    'profile_deleted',
    '/user/profile',
    'DELETE',
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown'
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User profile deleted successfully.',
  });
});

export const UserController = {
  createAdminOrSuperAdmin,
  checkUserNameAlreadyExists,
  getSingleUser,
  setUserLatestLocation,
  updateUserStatus,
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
};
