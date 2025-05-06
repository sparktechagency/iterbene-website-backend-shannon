import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { OtpService } from '../otp/otp.service';
import { User } from '../user/user.model';
import bcrypt from 'bcrypt';
import { config } from '../../config';
import { TokenService } from '../token/token.service';
import { TokenType } from '../token/token.interface';
import { OtpType } from '../otp/otp.interface';
import { TUser } from '../user/user.interface';
import { generateUsernameFromEmail } from '../../utils/generateUsernameFromEmail';
import moment from 'moment';
import { totp } from 'otplib';
import { UserInteractionLogService } from '../userInteractionLog/userInteractionLog.service';
import { Token } from '../token/token.model';

const createUser = async (userData: TUser, ip: string, userAgent: string) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User already exists.');
  }
  const userName = generateUsernameFromEmail(userData.email);
  userData.username = userName;

  const user = await User.create(userData);
  if (!user.isEmailVerified) {
    await OtpService.createVerificationEmailOtp(user.email);
    await UserInteractionLogService.createLog(
      user._id,
      'user_created',
      '/auth/register',
      'POST',
      ip,
      userAgent,
      { email: user.email }
    );
    return { userId: user._id };
  }
};

const verifyEmail = async (
  email: string,
  otp: string,
  ip: string,
  userAgent: string
) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }

  await OtpService.verifyOTP(
    user.email,
    otp,
    user.isResetPassword ? OtpType.RESET_PASSWORD : OtpType.VERIFY
  );

  user.isEmailVerified = true;
  user.isResetPassword = false;
  await user.save();

  const tokens = await TokenService.accessAndRefreshToken(user, ip, userAgent);
  await UserInteractionLogService.createLog(
    user._id,
    'email_verified',
    '/auth/verify-email',
    'POST',
    ip,
    userAgent,
    { email }
  );
  return { user, tokens };
};

const forgotPassword = async (email: string, ip: string, userAgent: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  await OtpService.createResetPasswordOtp(user.email);
  user.isResetPassword = true;
  await user.save();

  await UserInteractionLogService.createLog(
    user._id,
    'forgot_password',
    '/auth/forgot-password',
    'POST',
    ip,
    userAgent,
    { email }
  );
  return { userId: user._id };
};

const resendOtp = async (email: string, ip: string, userAgent: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }

  if (user.isResetPassword) {
    const resetPasswordToken = await TokenService.createResetPasswordToken(
      user
    );
    await OtpService.createResetPasswordOtp(user.email);
    await UserInteractionLogService.createLog(
      user._id,
      'resend_otp_reset',
      '/auth/resend-otp',
      'POST',
      ip,
      userAgent,
      { email }
    );
    return { resetPasswordToken };
  }

  await OtpService.createVerificationEmailOtp(user.email);
  await UserInteractionLogService.createLog(
    user._id,
    'resend_otp_verify',
    '/auth/resend-otp',
    'POST',
    ip,
    userAgent,
    { email }
  );
  return { userId: user._id };
};

const resetPassword = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select('+passwordHistory');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }

  const isReused = await Promise.all(
    user.passwordHistory.map(entry => bcrypt.compare(password, entry.hash))
  );
  if (isReused.includes(true)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reuse a previous password.'
    );
  }

  user.password = password;
  user.isResetPassword = false;
  await user.save();

  await UserInteractionLogService.createLog(
    user._id,
    'password_reset',
    '/auth/reset-password',
    'POST',
    'unknown',
    'unknown',
    { email }
  );
  return user;
};

const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
  ip: string,
  userAgent: string
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

  const isReused = await Promise.all(
    user.passwordHistory.map(entry => bcrypt.compare(newPassword, entry.hash))
  );
  if (isReused.includes(true)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reuse a previous password.'
    );
  }

  user.password = newPassword;
  user.lastPasswordChange = new Date();
  await user.save();

  await UserInteractionLogService.createLog(
    user._id,
    'password_changed',
    '/auth/change-password',
    'POST',
    ip,
    userAgent,
    { userId }
  );
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
  await UserInteractionLogService.createLog(
    token.user,
    'logout',
    '/auth/logout',
    'POST',
    'unknown',
    'unknown',
    { refreshToken: '***' }
  );
};

const refreshAuth = async (
  refreshToken: string,
  ip: string,
  userAgent: string
) => {
  const payload = await TokenService.verifyToken(
    refreshToken,
    config.jwt.refreshSecret,
    TokenType.REFRESH,
    ip,
    userAgent
  );
  const user = await User.findById(payload?.userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }

  await Token.deleteOne({ token: refreshToken, type: TokenType.REFRESH });
  const tokens = await TokenService.accessAndRefreshToken(user, ip, userAgent);

  await UserInteractionLogService.createLog(
    user._id,
    'token_refreshed',
    '/auth/refresh-token',
    'POST',
    ip,
    userAgent,
    { refreshToken: '***' }
  );
  return { tokens };
};

const enableMFA = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  const secret = totp.generate(user.id.toString());
  user.mfaSecret = secret;
  user.mfaEnabled = true;
  await user.save();
  await UserInteractionLogService.createLog(
    user._id,
    'mfa_enabled',
    '/auth/enable-mfa',
    'POST',
    'unknown',
    'unknown',
    { userId }
  );
  return secret;
};

const verifyMFA = async (userId: string, token: string) => {
  const user = await User.findById(userId).select('+mfaSecret');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }
  if (!user.mfaEnabled) return true;
  const isValid = totp.check(token, user.mfaSecret!);
  if (!isValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid MFA token.');
  }
  await UserInteractionLogService.createLog(
    user._id,
    'mfa_verified',
    '/auth/login',
    'POST',
    'unknown',
    'unknown',
    { userId }
  );
  return true;
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
  enableMFA,
  verifyMFA,
};
