import { Model, Types } from 'mongoose';

export type TToken = {
  user: Types.ObjectId;
  token: string;
  type: string;
  ip: string;
  userAgent: string;
  expiresAt: Date;
};

export const TokenType = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  RESET_PASSWORD: 'resetPassword',
  VERIFY_EMAIL: 'verifyEmail',
} as const;

export interface TokenModel extends Model<TToken> {
  isExistTokenByUserId(userId: string, type: string): Promise<TToken | null>;
}