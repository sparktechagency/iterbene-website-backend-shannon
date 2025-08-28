import { StatusCodes } from 'http-status-codes';
import jwt, { Secret } from 'jsonwebtoken';
import { config } from '../../config';
import ApiError from '../../errors/ApiError';
import { Token } from './token.model';
import { TUser } from '../user/user.interface';
import { TokenType } from './token.interface';
import { addMinutes, addDays } from 'date-fns';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}
const getExpirationTime = (expiration: string) => {
  const timeValue = parseInt(expiration);
  if (expiration.includes('d')) {
    return addDays(new Date(), timeValue);
  } else if (expiration.includes('m')) {
    return addMinutes(new Date(), timeValue);
  }
  return new Date();
};

const generateToken = (payload: object, secret: Secret, expireTime: string) => {
  return jwt.sign(payload, secret, { expiresIn: expireTime });
};

const saveToken = async (
  token: string,
  userId: string,
  type: string,
  expiresAt: Date
) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    type,
    expiresAt,
  });
  return tokenDoc;
};

const verifyToken = async (
  token: string,
  secret: Secret,
  type: string
): Promise<TokenPayload | null> => {
  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    const tokenDoc = await Token.findOne({
      token,
      type,
      user: payload.userId,
      expiresAt: { $gt: new Date() },
    });
    if (!tokenDoc) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token.');
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token format.');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token has expired.');
    }
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token verification failed.');
  }
};

const accessAndRefreshToken = async (user: TUser) => {
  // Clean up existing tokens for the user
  await Token.deleteMany({
    user: user._id,
    type: { $in: [TokenType.ACCESS, TokenType.REFRESH] },
  });

  const accessTokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = generateToken(
    accessTokenPayload,
    config.jwt.accessSecret as Secret,
    config.jwt.accessExpiration
  );

  const accessTokenExpires = getExpirationTime(config.jwt.accessExpiration);
  await saveToken(
    accessToken,
    user._id.toString(),
    TokenType.ACCESS,
    accessTokenExpires
  );

  const refreshTokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const refreshToken = generateToken(
    refreshTokenPayload,
    config.jwt.refreshSecret as Secret,
    config.jwt.refreshExpiration
  );

  const refreshTokenExpires = getExpirationTime(config.jwt.refreshExpiration);

  await saveToken(
    refreshToken,
    user._id.toString(),
    TokenType.REFRESH,
    refreshTokenExpires
  );

  return { accessToken, refreshToken };
};

const createEmailVerificationToken = async (user: TUser) => {
  const emailVerificationTokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };
  const emailVerificationToken = generateToken(
    emailVerificationTokenPayload,
    config.jwt.tokenSecret as Secret,
    config.jwt.emailVerificationTokenExpiration
  );
  const emailVerificationExpires = getExpirationTime(
    config.jwt.emailVerificationTokenExpiration
  );
  await saveToken(
    emailVerificationToken,
    user._id.toString(),
    TokenType.VERIFY_EMAIL,
    emailVerificationExpires
  );
  return emailVerificationToken;
};

const createResetPasswordToken = async (user: TUser) => {
  const resetPasswordTokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };
  const resetPasswordToken = generateToken(
    resetPasswordTokenPayload,
    config.jwt.tokenSecret as Secret,
    config.jwt.resetPasswordTokenExpiration
  );

  const resetPasswordExpires = getExpirationTime(
    config.jwt.resetPasswordTokenExpiration
  );

  await saveToken(
    resetPasswordToken,
    user._id.toString(),
    TokenType.RESET_PASSWORD,
    resetPasswordExpires
  );

  return resetPasswordToken;
};

const createLoginMfaToken = async (user: TUser) => {
  const loginMfaTokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };
  const loginMfaToken = generateToken(
    loginMfaTokenPayload,
    config.jwt.tokenSecret as Secret,
    config.jwt.accessExpiration // Use shorter expiration for MFA
  );

  const loginMfaExpires = getExpirationTime(config.jwt.accessExpiration);

  await saveToken(
    loginMfaToken,
    user._id.toString(),
    TokenType.LOGIN_MFA,
    loginMfaExpires
  );

  return loginMfaToken;
};

export const TokenService = {
  generateToken,
  saveToken,
  verifyToken,
  accessAndRefreshToken,
  createEmailVerificationToken,
  createResetPasswordToken,
  createLoginMfaToken,
};
