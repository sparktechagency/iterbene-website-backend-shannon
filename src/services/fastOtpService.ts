import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../errors/ApiError';
import OTP from '../modules/otp/otp.model';
import { config } from '../config';
import { addEmailJob } from './queueService';
import { logger, errorLogger } from '../shared/logger';

const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// Fast OTP creation with background email processing
const createVerificationEmailOtpFast = async (email: string) => {
  try {
    // Step 1: Check rate limiting (quick DB query)
    const lastOtp = await OTP.findOne(
      { userEmail: email, type: 'verify' },
      {},
      { sort: { createdAt: -1 } }
    ).lean();
    
    if (lastOtp && Date.now() - lastOtp.createdAt.getTime() < 60000) {
      throw new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        'Please wait 1 minute before requesting a new OTP.'
      );
    }

    // Step 2: Generate and save OTP (fast operation)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + config.otp.verifyEmailOtpExpiration * 60 * 1000);
    
    // Create OTP document
    const otpDoc = await OTP.create({
      userEmail: email,
      otp,
      type: 'verify',
      expiresAt,
    });

    // Step 3: Queue email for background processing (non-blocking)
    addEmailJob({
      type: 'verification',
      email,
      otp: otpDoc.otp,
    }).catch(error => {
      errorLogger.error('Failed to queue verification email:', error);
      // Don't throw error here - user registration should still succeed
    });

    logger.info(`OTP created for ${email}, email queued for sending`);
    return otpDoc;
  } catch (error) {
    throw error;
  }
};

const createResetPasswordOtpFast = async (email: string) => {
  try {
    const lastOtp = await OTP.findOne(
      { userEmail: email, type: 'reset_password' },
      {},
      { sort: { createdAt: -1 } }
    ).lean();
    
    if (lastOtp && Date.now() - lastOtp.createdAt.getTime() < 60000) {
      throw new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        'Please wait 1 minute before requesting a new OTP.'
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + config.otp.resetPasswordOtpExpiration * 60 * 1000);
    
    const otpDoc = await OTP.create({
      userEmail: email,
      otp,
      type: 'reset_password',
      expiresAt,
    });

    // Queue email for background processing
    addEmailJob({
      type: 'reset-password',
      email,
      otp: otpDoc.otp,
    }).catch(error => {
      errorLogger.error('Failed to queue reset password email:', error);
    });

    return otpDoc;
  } catch (error) {
    throw error;
  }
};

const createLoginMfaOtpFast = async (email: string) => {
  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for MFA
    
    const otpDoc = await OTP.create({
      userEmail: email,
      otp,
      type: 'login_mfa',
      expiresAt,
    });

    // Queue email for background processing
    addEmailJob({
      type: 'login-mfa',
      email,
      otp: otpDoc.otp,
    }, 10).catch(error => { // Higher priority for MFA
      errorLogger.error('Failed to queue MFA email:', error);
    });

    return otpDoc;
  } catch (error) {
    throw error;
  }
};

// Fast OTP verification (unchanged - already fast)
const verifyOTP = async (userEmail: string, otp: string, type: string) => {
  const otpDoc = await OTP.findOne({
    userEmail,
    otp,
    type,
    verified: false,
  });

  if (!otpDoc) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP not found.');
  }

  if (otpDoc.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP expired.');
  }

  // Check attempt limits
  const windowStart = new Date(Date.now() - config.otp.attemptWindowMinutes * 60 * 1000);
  if (
    otpDoc.attempts >= config.otp.maxOtpAttempts &&
    otpDoc.lastAttemptAt &&
    otpDoc.lastAttemptAt > windowStart
  ) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Too many attempts. Try again after ${config.otp.attemptWindowMinutes} minutes.`
    );
  }

  // Update attempts
  otpDoc.attempts += 1;
  otpDoc.lastAttemptAt = new Date();

  if (otpDoc.attempts > config.otp.maxOtpAttempts) {
    await otpDoc.save();
    throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, 'Too many attempts.');
  }

  // Mark as verified
  otpDoc.verified = true;
  await otpDoc.save();

  return otpDoc;
};

export const FastOtpService = {
  createVerificationEmailOtpFast,
  createResetPasswordOtpFast,
  createLoginMfaOtpFast,
  verifyOTP,
};