import { Model } from 'mongoose';

export type TOtp = {
  userEmail: string;
  otp: string;
  type: OtpType;
  verified: boolean;
  expiresAt: Date;
  attempts: number;
  lastAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export enum OtpType {
  VERIFY = 'verify',
  RESET_PASSWORD = 'resetPassword',
  LOGIN_MFA = 'loginMfa',
}

export const isValidOtpType = (type: string): type is OtpType => {
  return Object.values(OtpType).includes(type as OtpType);
};

export interface OtpModel extends Model<TOtp> {
  isExistOtpByEmail(email: string, type: OtpType): Promise<TOtp | null>;
  findValidOtp(email: string, otp: string, type: OtpType): Promise<TOtp | null>;
}
