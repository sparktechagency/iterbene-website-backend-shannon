import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { OtpService } from '../otp/otp.service';
import { FastOtpService } from '../../services/fastOtpService';
import { errorLogger } from '../../shared/logger';
import { User } from '../user/user.model';
import bcrypt from 'bcrypt';
import { config } from '../../config';
import { TokenService } from '../token/token.service';
import { TokenType } from '../token/token.interface';
import { OtpType } from '../otp/otp.interface';
import { TUser } from '../user/user.interface';
import { generateUsernameFromEmail } from '../../utils/generateUsernameFromEmail';
import moment from 'moment';
import { Token } from '../token/token.model';

const createUser = async (userData: TUser) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User already exists.');
  }
  const userName = generateUsernameFromEmail(userData.email);
  userData.username = userName;

  const user = await User.create(userData);
  if (!user.isEmailVerified) {
    // Use fast OTP service for background email processing
    FastOtpService.createVerificationEmailOtpFast(user.email).catch(error => {
      // Log error but don't block user registration
      errorLogger.error('Failed to send verification email:', error);
    });
    const tokens = await TokenService.accessAndRefreshToken(user);
    return tokens;
  }
};

const verifyEmail = async (email: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  await OtpService.verifyOTP(
    user.email,
    otp,
    user.isResetPassword
      ? OtpType.RESET_PASSWORD
      : user.isLoginMfa
      ? OtpType.LOGIN_MFA
      : OtpType.VERIFY
  );
  user.isEmailVerified = true;
  user.isResetPassword = false;
  user.isLoginMfa = false;
  await user.save();

  const tokens = await TokenService.accessAndRefreshToken(user);
  return { tokens };
};
const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  await OtpService.createResetPasswordOtp(user.email);
  user.isResetPassword = true;
  await user.save();
  const tokens = await TokenService.accessAndRefreshToken(user);
  return tokens;
};

const resendOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }

  if (user.isResetPassword) {
    const resetPasswordToken = await TokenService.createResetPasswordToken(
      user
    );
    await OtpService.createResetPasswordOtp(user.email);
    return { resetPasswordToken };
  } else if (user.isLoginMfa) {
    const loginMfaToken = await TokenService.accessAndRefreshToken(user);
    await OtpService.createLoginMfaOtp(user.email);
    return { loginMfaToken };
  }
  await OtpService.createVerificationEmailOtp(user.email);
  const tokens = await TokenService.accessAndRefreshToken(user);
  return tokens;
};

const resetPassword = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select('+passwordHistory');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  user.password = password;
  user.isResetPassword = false;
  await user.save();
  return user;
};

const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await User.findById(userId).select(
    '+password +passwordHistory +mfaSecret'
  );
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }

  if (
    user.lastPasswordChange &&
    moment().diff(user.lastPasswordChange, 'hours') < 1
  ) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      'You can only change your password once per hour.'
    );
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid password.');
  }

  user.password = newPassword;
  user.lastPasswordChange = new Date();
  await user.save();
  return user;
};

const logout = async (refreshToken: string) => {
  const token = await Token.findOneAndDelete({
    token: refreshToken,
    type: TokenType.REFRESH,
  });
  if (!token) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid refresh token.');
  }
};

const refreshAuth = async (refreshToken: string) => {
  const payload = await TokenService.verifyToken(
    refreshToken,
    config.jwt.refreshSecret,
    TokenType.REFRESH
  );
  const user = await User.findById(payload?.userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }

  await Token.deleteOne({ token: refreshToken, type: TokenType.REFRESH });
  const tokens = await TokenService.accessAndRefreshToken(user);

  return { tokens };
};

export const AuthService = {
  createUser,
  verifyEmail,
  resetPassword,
  forgotPassword,
  resendOtp,
  logout,
  changePassword,
  refreshAuth,
};
