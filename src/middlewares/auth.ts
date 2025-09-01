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

const auth = (...requiredRights: string[]) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Extract token from Authorization header or cookies
    const token = AuthUtils.extractToken(req.headers.authorization, req.cookies);

    if (!token) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Authorization to access this resource is denied.'
      );
    }

    const verifyUser = await TokenService.verifyToken(
      token,
      config.jwt.accessSecret as Secret,
      TokenType.ACCESS
    );
    if (!verifyUser) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token.');
    }

    req.user = verifyUser;

    const user = await User.findById(verifyUser.userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
    }
    
    // Validate user account status
    const statusValidation = AuthUtils.validateUserStatus(user);
    if (!statusValidation.isValid) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        statusValidation.error || 'Account access denied.'
      );
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

export default auth;
