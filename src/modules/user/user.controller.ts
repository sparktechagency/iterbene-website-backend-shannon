import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import ApiError from '../../errors/ApiError';
import { UserService } from './user.service';
import { uploadFilesToS3 } from '../../helpers/s3Service';
const UPLOADS_FOLDER = 'uploads/users';

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
  const { userName } = req.params;
  const result = await UserService.getSingleUser(userName);
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
  const result = await uploadFilesToS3(
    [file],
    UPLOADS_FOLDER
  );

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
  const result = await uploadFilesToS3(
    [file],
    UPLOADS_FOLDER
  );

 const updatedResult = await UserService.updateCoverImage(userId, result[0]);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: updatedResult,
    message: 'Cover image updated successfully.',
  });
})
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

export const UserController = {
  createAdminOrSuperAdmin,
  checkUserNameAlreadyExists,
  getSingleUser,
  setUserLatestLocation,
  updateUserStatus,
  getMyProfile,
  updateProfileImage,
  updateCoverImage,
  updateMyProfile,
  deleteMyProfile,
};
