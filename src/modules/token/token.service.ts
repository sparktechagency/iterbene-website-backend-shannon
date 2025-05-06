import { StatusCodes } from 'http-status-codes';
import jwt, { Secret } from 'jsonwebtoken';
import { config } from '../../config';
import ApiError from '../../errors/ApiError';
import { Token } from './token.model';
import { TUser } from '../user/user.interface';
import { TokenType } from './token.interface';
import moment from 'moment';
import { UserInteractionLogService } from '../userInteractionLog/userInteractionLog.service';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  ip: string;
  userAgent: string;
}

const generateToken = (
  payload: TokenPayload,
  secret: Secret,
  expiresIn: string
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

const saveToken = async (
  token: string,
  userId: string,
  type: string,
  ip: string,
  userAgent: string,
  expiresAt: Date
) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    type,
    ip,
    userAgent,
    expiresAt,
  });
  return tokenDoc;
};

const verifyToken = async (
  token: string,
  secret: Secret,
  type: string,
  ip: string,
  userAgent: string
): Promise<TokenPayload | null> => {
  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    const tokenDoc = await Token.findOne({
      token,
      type,
      user: payload.userId,
      ip,
      userAgent,
    });
    if (!tokenDoc) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token.');
    }
    return payload;
  } catch (error) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token.');
  }
};

const accessAndRefreshToken = async (
  user: TUser,
  ip: string,
  userAgent: string
) => {
  const accessTokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    ip,
    userAgent,
  };

  const accessToken = generateToken(
    accessTokenPayload,
    config.jwt.accessSecret as Secret,
    config.jwt.accessExpiration
  );

  const accessTokenExpires = moment().add(
    moment.duration(config.jwt.accessExpiration)
  );

  await saveToken(
    accessToken,
    user._id.toString(),
    TokenType.ACCESS,
    ip,
    userAgent,
    accessTokenExpires.toDate()
  );

  const refreshTokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    ip,
    userAgent,
  };

  const refreshToken = generateToken(
    refreshTokenPayload,
    config.jwt.refreshSecret as Secret,
    config.jwt.refreshExpiration
  );

  const refreshTokenExpires = moment().add(
    moment.duration(config.jwt.refreshExpiration)
  );

  await saveToken(
    refreshToken,
    user._id.toString(),
    TokenType.REFRESH,
    ip,
    userAgent,
    refreshTokenExpires.toDate()
  );

  await UserInteractionLogService.createLog(
    user._id,
    'tokens_generated',
    '/auth/token',
    'POST',
    ip,
    userAgent,
    { email: user.email }
  );

  return { accessToken, refreshToken };
};

const createResetPasswordToken = async (user: TUser) => {
  const resetPasswordTokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    ip: 'unknown',
    userAgent: 'unknown',
  };
  const resetPasswordToken = generateToken(
    resetPasswordTokenPayload,
    config.token.TokenSecret as Secret,
    config.token.resetPasswordTokenExpiration
  );

  const resetPasswordExpires = moment().add(
    moment.duration(config.token.resetPasswordTokenExpiration)
  );

  await saveToken(
    resetPasswordToken,
    user._id.toString(),
    TokenType.RESET_PASSWORD,
    'unknown',
    'unknown',
    resetPasswordExpires.toDate()
  );

  await UserInteractionLogService.createLog(
    user._id,
    'reset_password_token_created',
    '/auth/forgot-password',
    'POST',
    'unknown',
    'unknown',
    { email: user.email }
  );

  return resetPasswordToken;
};

export const TokenService = {
  generateToken,
  saveToken,
  verifyToken,
  accessAndRefreshToken,
  createResetPasswordToken,
};
