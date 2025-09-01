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
      `User account is banned until ${user?.banUntil?.toLocaleString()}`
    );
  }
};

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
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid credentials.');
  }
  validateUserStatus(user);
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(
      StatusCodes.LOCKED,
      `Account is locked until ${user.lockUntil.toLocaleString()} due to too many failed login attempts.`
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= config.auth.maxLoginAttempts) {
      user.lockUntil = moment().add(config.auth.lockTime, 'minutes').toDate();
      await user.save();
      throw new ApiError(
        StatusCodes.LOCKED,
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

  if (!user.isEmailVerified) {
    await OtpService.createVerificationEmailOtp(user.email);
    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Email is not verified. Please verify your email.',
      data: {
        email: user.email,
      },
    });
    return;
  }

  // // add mfa verification
  // user.isLoginMfa = true;
  // await user.save();
  // await OtpService.createLoginMfaOtp(user.email);
  // const tokens = await TokenService.accessAndRefreshToken(user);
  // //  send response
  // sendResponse(res, {
  //   code: StatusCodes.OK,
  //   message: 'Please verify your email.',
  //   data: tokens,
  // });

  // manually login
  const tokens = await TokenService.accessAndRefreshToken(user);
  // Set secure cookies for access and refresh tokens
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: config.environment === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: config.environment === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
  // Send response with tokens
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged in successfully.',
    data: { tokens },
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const result = await AuthService.verifyEmail(email, otp);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Email verified successfully.',
    data: result,
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
    data: { result },
  });
});

const logout = catchAsync(async (req, res) => {
  // Get refresh token from cookies
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      await AuthService.logout(refreshToken);
    } catch (error) {
      // Continue with logout even if token cleanup fails
    }
  }

  // Clear cookies
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: config.environment === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.environment === 'production',
    sameSite: 'strict',
    path: '/',
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged out successfully.',
    data: {},
  });
});

const refreshToken = catchAsync(async (req, res) => {
  //get refresh token from cookies
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Refresh token is required.');
  }
  const tokens = await AuthService.refreshAuth(refreshToken);
  res.cookie('accessToken', tokens.tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', tokens.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Refresh token retrieved successfully.',
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
