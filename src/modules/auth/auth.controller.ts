import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { AuthService } from './auth.service';
import { TokenService } from '../token/token.service';
import ApiError from '../../errors/ApiError';
import { config } from '../../config';
import moment from 'moment';
import bcrypt from 'bcrypt';
import { User } from '../user/user.model';
import { TUser } from '../user/user.interface';
import { OtpService } from '../otp/otp.service';

const validateUserStatus = (user: TUser) => {
  if (user?.isDeleted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User account is deleted.');
  }
  if (user?.isBlocked) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User account is blocked.');
  }
  if (user?.isBanned) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `User account is banned. ${user?.banUntil?.toLocaleString()}`
    );
  }
};

// register
const register = catchAsync(async (req, res) => {
  if (req.body?.role === 'admin' || req.body?.role === 'super_admin') {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Unauthorized to create admin or super admin.'
    );
  }
  const result = await AuthService.createUser(req.body);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'User created successfully. Please verify your email.',
    data: result,
  });
});

const login = catchAsync(async (req, res) => {
  const { userName, password } = req.body;
  //this userName check userOrPhone number both
  const user = await User.findOne({
    $or: [{ email: userName }, { phoneNumber: userName }],
  }).select('+password');
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid credentials.');
  }
  validateUserStatus(user);
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Account locked for ${config.auth.lockTime} minutes due to too many failed attempts.`
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user?.password);
  if (!isPasswordValid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= config.auth.maxLoginAttempts) {
      user.lockUntil = moment().add(config.auth.lockTime, 'minutes').toDate();
      await user.save();
      throw new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        `Account locked for ${config.auth.lockTime} minutes due to too many failed attempts.`
      );
    }
    await user.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid credentials.');
  }
  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }
  //if email is not verified
  if (!user.isEmailVerified) {
    // Create verification email token
    const verificationToken = await TokenService.createVerifyEmailToken(user);
    // Create verification email OTP
    await OtpService.createVerificationEmailOtp(user?.email);
    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Email is not verified. Please verify your email.',
      data: {
        verificationToken,
      },
    });
  }
  const tokens = await TokenService.accessAndRefreshToken(user);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged in successfully.',
    data: {
      user,
      tokens,
    },
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const { email, token, otp } = req.body;
  const result = await AuthService.verifyEmail(email, token, otp);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Email verified successfully.',
    data: {
      result,
    },
  });
});

const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.resendOtp(email);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'OTP sent successfully.',
    data: result,
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await AuthService.forgotPassword(req.body.email);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password reset email sent successfully.',
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body;
  const result = await AuthService.changePassword(
    userId,
    currentPassword,
    newPassword
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password changed successfully.',
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.resetPassword(email, password);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password reset successfully.',
    data: {
      result,
    },
  });
});

const logout = catchAsync(async (req, res) => {
  await AuthService.logout(req.body.refreshToken);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged out successfully.',
    data: {},
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Refresh token is required.');
  }
  const tokens = await AuthService.refreshAuth(refreshToken);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Refresh token retrieved in successfully.',
    data: tokens,
  });
});

export const AuthController = {
  register,
  login,
  verifyEmail,
  resendOtp,
  logout,
  changePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
};
