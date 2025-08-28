import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import ApiError from '../errors/ApiError';
import catchAsync from '../shared/catchAsync';
import { config } from '../config';
import { TokenService } from '../modules/token/token.service';
import { TokenType } from '../modules/token/token.interface';
import { User } from '../modules/user/user.model';
import { roleRights } from './roles';
import { AuthUtils } from '../utils/authUtils';

interface AuthConfig {
  tokenTypes?: TokenType[];
  requiredRights?: string[];
  allowedUserStates?: {
    unverifiedEmail?: boolean;
    resetPassword?: boolean;
    loginMfa?: boolean;
  };
}

/**
 * Smart auth middleware that can handle different token types and user states
 */
const smartAuth = (authConfig?: AuthConfig) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const {
      tokenTypes = [TokenType.ACCESS],
      requiredRights = [],
      allowedUserStates = {},
    } = authConfig || {};

    const token = AuthUtils.extractToken(
      req.headers.authorization,
      req.cookies
    );

    if (!token) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Authorization token required'
      );
    }

    let verifyUser;
    let tokenFound = false;

    // Try to verify with different token types
    for (const tokenType of tokenTypes) {
      try {
        let secret: Secret;

        // Use appropriate secret based on token type
        switch (tokenType) {
          case TokenType.ACCESS:
            secret = config.jwt.accessSecret as Secret;
            break;
          case TokenType.REFRESH:
            secret = config.jwt.refreshSecret as Secret;
            break;
          case TokenType.VERIFY_EMAIL:
          case TokenType.RESET_PASSWORD:
          case TokenType.LOGIN_MFA:
            secret = config.jwt.tokenSecret as Secret;
            break;
          default:
            secret = config.jwt.tokenSecret as Secret;
        }

        verifyUser = await TokenService.verifyToken(token, secret, tokenType);
        if (verifyUser) {
          tokenFound = true;
          break;
        }
      } catch (error) {
        // Continue trying other token types
        continue;
      }
    }

    if (!tokenFound || !verifyUser) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token.');
    }

    req.user = verifyUser;

    const user = await User.findById(verifyUser.userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
    }

    // Check basic user status (deleted, blocked, banned)
    const statusValidation = AuthUtils.validateUserStatus(user);
    if (!statusValidation.isValid) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        statusValidation.error || 'Account access denied.'
      );
    }

    // Check allowed user states
    if (!allowedUserStates.unverifiedEmail && !user.isEmailVerified) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Email verification required.');
    }

    if (!allowedUserStates.resetPassword && user.isResetPassword) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Password reset required.');
    }

    if (!allowedUserStates.loginMfa && user.isLoginMfa) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'MFA verification required.');
    }

    // Check permissions
    if (requiredRights.length > 0) {
      const userRights = roleRights.get(user.role) || [];

      if (!AuthUtils.hasPermission(userRights, requiredRights)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this resource."
        );
      }
    }

    next();
  });

// Convenience functions for common auth scenarios
export const fullAuth = (...requiredRights: string[]) =>
  smartAuth({
    tokenTypes: [TokenType.ACCESS],
    requiredRights,
    allowedUserStates: {
      unverifiedEmail: false,
      resetPassword: false,
      loginMfa: false,
    },
  });

export const emailVerificationAuth = () =>
  smartAuth({
    tokenTypes: [TokenType.VERIFY_EMAIL],
    allowedUserStates: {
      unverifiedEmail: true,
      resetPassword: false,
      loginMfa: false,
    },
  });

export const resetPasswordAuth = () =>
  smartAuth({
    tokenTypes: [TokenType.RESET_PASSWORD],
    allowedUserStates: {
      unverifiedEmail: true,
      resetPassword: true,
      loginMfa: false,
    },
  });

export const mfaAuth = () =>
  smartAuth({
    tokenTypes: [TokenType.LOGIN_MFA],
    allowedUserStates: {
      unverifiedEmail: false,
      resetPassword: false,
      loginMfa: true,
    },
  });

export const refreshAuth = () =>
  smartAuth({
    tokenTypes: [TokenType.REFRESH],
    allowedUserStates: {
      unverifiedEmail: true,
      resetPassword: true,
      loginMfa: true,
    },
  });

// Multi-token auth - accepts any verification token based on user state
export const multiTokenAuth = () =>
  smartAuth({
    tokenTypes: [
      TokenType.VERIFY_EMAIL,
      TokenType.RESET_PASSWORD,
      TokenType.LOGIN_MFA,
    ],
    allowedUserStates: {
      unverifiedEmail: true,
      resetPassword: true,
      loginMfa: true,
    },
  });

export default smartAuth;
