import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';
import ApiError from '../../errors/ApiError';
import { sendResetPasswordEmail, sendVerificationEmail } from '../../helpers/emailService';
import OTP from './otp.model';
import { config } from '../../config';
import { User } from '../user/user.model';
import { UserInteractionLogService } from '../userInteractionLog/userInteractionLog.service';

const obfuscateEmail = (email: string) => {
  const [local, domain] = email.split('@');
  return `${local[0]}***${local.slice(-1)}@${domain}`;
};

const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

const createOTP = async (userEmail: string, expiresInMinutes: string, type: string) => {
  const user = await User.findOne({ email: userEmail });
  const lastOtp = await OTP.findOne({ userEmail, type }).sort({ createdAt: -1 });
  if (lastOtp && moment().diff(lastOtp.createdAt, 'seconds') < 60) {
    await UserInteractionLogService.createLog(
      user?._id,
      'otp_request_failed_cooldown',
      '/auth/resend-otp',
      'POST',
      'unknown',
      'unknown',
      { email: userEmail }
    );
    throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, 'Please wait 1 minute before requesting a new OTP.');
  }

  const existingOTP = await OTP.findOne({
    userEmail,
    type,
    verified: false,
    expiresAt: { $gt: new Date() },
  });

  if (existingOTP) {
    const windowStart = moment().subtract(config.otp.attemptWindowMinutes, 'minutes').toDate();
    if (
      existingOTP.attempts >= config.otp.maxOtpAttempts &&
      existingOTP.lastAttemptAt &&
      existingOTP.lastAttemptAt > windowStart
    ) {
      await UserInteractionLogService.createLog(
        user?._id,
        'otp_request_failed_max_attempts',
        '/auth/resend-otp',
        'POST',
        'unknown',
        'unknown',
        { email: userEmail }
      );
      throw new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        `Too many attempts. Try again after ${config.otp.attemptWindowMinutes} minutes.`
      );
    }
  }


  const otp = generateOTP();
  const otpDoc = await OTP.create({
    userEmail,
    otp,
    type,
    expiresAt: moment.utc().add(parseInt(expiresInMinutes), 'minutes').toDate(),
  });

  await UserInteractionLogService.createLog(
    user?._id,
    `otp_created_${type}`,
    '/auth/resend-otp',
    'POST',
    'unknown',
    'unknown',
    { email: userEmail }
  );
  console.log(`OTP generated for ${obfuscateEmail(userEmail)}: ${otpDoc.otp}`);
  return otpDoc;
};

const verifyOTP = async (userEmail: string, otp: string, type: string) => {
  const user = await User.findOne({ email: userEmail });
  console.log(`Verifying OTP for ${obfuscateEmail(userEmail)}, type: ${type}`);
  const otpDoc = await OTP.findOne({
    userEmail,
    type,
    verified: false,
  });
  if (!otpDoc) {
    await UserInteractionLogService.createLog(
      user?._id,
      'otp_verify_failed_not_found',
      '/auth/verify-email',
      'POST',
      'unknown',
      'unknown',
      { email: userEmail }
    );
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP not found.');
  }

  if (otpDoc.expiresAt < new Date()) {
    await UserInteractionLogService.createLog(
      user?._id,
      'otp_verify_failed_expired',
      '/auth/verify-email',
      'POST',
      'unknown',
      'unknown',
      { email: userEmail }
    );
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP expired.');
  }

  otpDoc.attempts += 1;
  otpDoc.lastAttemptAt = new Date();

  if (otpDoc.attempts > config.otp.maxOtpAttempts) {
    await otpDoc.save();
    await UserInteractionLogService.createLog(
      user?._id,
      'otp_verify_failed_max_attempts',
      '/auth/verify-email',
      'POST',
      'unknown',
      'unknown',
      { email: userEmail }
    );
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Too many attempts. Try again after ${config.otp.attemptWindowMinutes} minutes.`
    );
  }

  if (otpDoc.otp !== otp) {
    await otpDoc.save();
    await UserInteractionLogService.createLog(
      user?._id,
      'otp_verify_failed_invalid',
      '/auth/verify-email',
      'POST',
      'unknown',
      'unknown',
      { email: userEmail }
    );
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP.');
  }

  otpDoc.verified = true;
  await otpDoc.save();
  await UserInteractionLogService.createLog(
    user?._id,
    `otp_verified_${type}`,
    '/auth/verify-email',
    'POST',
    'unknown',
    'unknown',
    { email: userEmail }
  );
  return true;
};

const createVerificationEmailOtp = async (email: string) => {
  const otpDoc = await createOTP(
    email,
    config.otp.verifyEmailOtpExpiration.toString(),
    'verify'
  );
  await sendVerificationEmail(email, otpDoc.otp);
  return otpDoc;
};

const createResetPasswordOtp = async (email: string) => {
  const otpDoc = await createOTP(
    email,
    config.otp.resetPasswordOtpExpiration.toString(),
    'resetPassword'
  );
  await sendResetPasswordEmail(email, otpDoc.otp);
  return otpDoc;
};

export const OtpService = {
  createOTP,
  verifyOTP,
  createVerificationEmailOtp,
  createResetPasswordOtp,
};