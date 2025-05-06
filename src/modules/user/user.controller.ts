import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import pick from '../../shared/pick';
import sendResponse from '../../shared/sendResponse';
import ApiError from '../../errors/ApiError';
import { UserService } from './user.service';
import { TPhoto } from './user.interface';

const createAdminOrSuperAdmin = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const super_admin = await UserService.getSingleUser(userId);
  if (super_admin?.role !== 'super_admin') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
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


/** ===================================Get single user =================================== */
const getSingleUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await UserService.getSingleUser(userId);
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


const updateMyProfile = catchAsync(async (req, res) => {
  const { userId } = req.user;
  if (req.file) {
    req.body.profileImage = {
      imageUrl: '/uploads/users/' + req.file.filename,
      file: req.file,
    };
  }
  const payload = req.body;
  const result = await UserService.updateMyProfile(userId, payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User profile updated successfully.',
  });
});

/** ===================================Update user status =================================== */
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
  const userId = req.user.userId;
  const result = await UserService.getMyProfile(userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User profile fetched successfully.',
  });
});

const deleteMyProfile = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const result = await UserService.deleteMyProfile(userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User profile deleted successfully.',
  });
});

export const UserController = {
  createAdminOrSuperAdmin,
  getSingleUser,
  setUserLatestLocation,
  updateUserStatus,
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
};
