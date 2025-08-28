import { Schema, model } from 'mongoose';
import { TOtp, OtpModel } from './otp.interface';
import { OtpType } from './otp.interface';

const otpSchema = new Schema<TOtp, OtpModel>(
  {
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(OtpType),
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '0' },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.statics.isExistOtpByEmail = async function (email: string, type: string) {
  return await this.findOne({ userEmail: email, type });
};

otpSchema.statics.findValidOtp = async function (email: string, otp: string, type: string) {
  return await this.findOne({
    userEmail: email,
    otp,
    type,
    verified: false,
    expiresAt: { $gt: new Date() },
  });
};

otpSchema.index({ userEmail: 1, type: 1 });

export default model<TOtp, OtpModel>('OTP', otpSchema);