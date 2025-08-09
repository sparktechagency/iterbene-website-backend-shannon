import { Model } from 'mongoose';

export type TOtp = {
  userEmail: string;
  otp: string;
  type: string;
  verified: boolean;
  expiresAt: Date;
  attempts: number;
  lastAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const OtpType = {
  VERIFY: 'verify',
  RESET_PASSWORD: 'resetPassword',
  LOGIN_MFA: 'loginMfa',
} as const;

export interface OtpModel extends Model<TOtp> {
  isExistOtpByEmail(email: string, type: string): Promise<TOtp | null>;
}
