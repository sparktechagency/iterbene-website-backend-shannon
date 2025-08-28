import { Model, Types } from 'mongoose';

export type TToken = {
  user: Types.ObjectId;
  token: string;
  type: string;
  expiresAt: Date;
};

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  RESET_PASSWORD = 'resetPassword',
  VERIFY_EMAIL = 'verifyEmail',
  LOGIN_MFA = 'loginMfa',
}

export const isValidTokenType = (type: string): type is TokenType => {
  return Object.values(TokenType).includes(type as TokenType);
};

export interface TokenModel extends Model<TToken> {
  isExistTokenByUserId(userId: string, type: string): Promise<TToken | null>;
}