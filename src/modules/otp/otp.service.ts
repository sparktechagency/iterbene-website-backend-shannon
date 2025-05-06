import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';
import ApiError from '../../errors/ApiError';
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from '../../helpers/emailService';
import OTP from './otp.model';
import { config } from '../../config';

const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

const createOTP = async (
  userEmail: string,
  expiresInMinutes: string,
  type: string
) => {
  const existingOTP = await OTP.findOne({
    userEmail,
    type,
    verified: false,
    expiresAt: { $gt: new Date() },
  });

  if (existingOTP) {
    const windowStart = moment()
      .subtract(config.otp.attemptWindowMinutes, 'minutes')
      .toDate();
    if (
      existingOTP.attempts >= config.otp.maxOtpAttempts &&
      existingOTP.lastAttemptAt &&
      existingOTP.lastAttemptAt > windowStart
    ) {
      throw new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        `Too many attempts. Try again after ${config.otp.attemptWindowMinutes} minutes.`
      );
    }
  }

  await OTP.deleteMany({ userEmail, type });

  const otp = generateOTP();
  const otpDoc = await OTP.create({
    userEmail,
    otp,
    type,
    expiresAt: moment.utc().add(parseInt(expiresInMinutes), 'minutes').toDate(),
  });

  return otpDoc;
};

const verifyOTP = async (userEmail: string, otp: string, type: string) => {
  console.log(userEmail, otp, type);
  const otpDoc = await OTP.findOne({
    userEmail,
    type,
    verified: false,
  });
  if (!otpDoc) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP not found.');
  }

  if (otpDoc.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP expired.');
  }

  otpDoc.attempts += 1;
  otpDoc.lastAttemptAt = new Date();

  if (otpDoc.attempts > config.otp.maxOtpAttempts) {
    await otpDoc.save();
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Too many attempts. Try again after ${config.otp.attemptWindowMinutes} minutes.`
    );
  }

  if (otpDoc.otp !== otp) {
    await otpDoc.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP.');
  }

  otpDoc.verified = true;
  await otpDoc.save();
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
