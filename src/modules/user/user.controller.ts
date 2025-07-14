import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import ApiError from '../../errors/ApiError';
import { UserService } from './user.service';
import { uploadFilesToS3 } from '../../helpers/s3Service';
import { USER_UPLOADS_FOLDER } from './user.constant';

const createAdminOrSuperAdmin = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const superAdmin = await UserService.getSingleUser(userId, userId);
  if (superAdmin?.role !== 'super_admin') {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only super admin can create admin or super admin.'
    );
  }

  const payload = req.body;
  const result = await UserService.createAdminOrSuperAdmin(payload);

  sendResponse(res, {
    code: StatusCodes.CREATED,
    data: result,
    message: `Admin created successfully with role: ${payload.role}.`,
  });
});

const getSingleUser = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { userName } = req.params;
  const result = await UserService.getSingleUser(userName, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User fetched successfully.',
  });
});

const getSingleUserByUser = catchAsync(async (req, res) => {
  const { userId: requesterId } = req.user;
  const { userId } = req.params;
  const result = await UserService.getSingleUserByUser(userId, requesterId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User fetched successfully.',
  });
});
const setUserLatestLocation = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserService.setUserLatestLocation(userId, req.body);

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User location updated successfully.',
  });
});

const checkUserNameAlreadyExists = catchAsync(async (req, res) => {
  const { userName } = req.params;
  const result = await UserService.checkUserNameAlreadyExists(userName);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User name checked successfully.',
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserService.updateMyProfile(userId, req.body);

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User profile updated successfully.',
  });
});

const updateProfileImage = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const file = req.file as Express.Multer.File;
  const result = await uploadFilesToS3([file], USER_UPLOADS_FOLDER);

  const updatedResult = await UserService.updateProfileImage(userId, result[0]);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: updatedResult,
    message: 'Profile image updated successfully.',
  });
});
const updateCoverImage = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const file = req.file as Express.Multer.File;
  const result = await uploadFilesToS3([file], USER_UPLOADS_FOLDER);

  const updatedResult = await UserService.updateCoverImage(userId, result[0]);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: updatedResult,
    message: 'Cover image updated successfully.',
  });
});
const updateUserStatus = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const result = await UserService.updateUserStatus(userId, status);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User status updated successfully.',
  });
});

const getMyProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserService.getMyProfile(userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User profile fetched successfully.',
  });
});

const deleteMyProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await UserService.deleteMyProfile(userId);

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User profile deleted successfully.',
  });
});

const updatePrivacySettings = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { privacySettings } = req.body;
  const result = await UserService.updatePrivacySettings(
    userId,
    privacySettings
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Privacy settings updated successfully.',
  });
});

export const UserController = {
  createAdminOrSuperAdmin,
  checkUserNameAlreadyExists,
  getSingleUser,
  setUserLatestLocation,
  updateUserStatus,
  getMyProfile,
  updateProfileImage,
  getSingleUserByUser,
  updateCoverImage,
  updateMyProfile,
  deleteMyProfile,
  updatePrivacySettings,
};
