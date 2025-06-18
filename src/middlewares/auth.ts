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

const auth = (...roles: string[]) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tokenWithBearer = req.headers.authorization;
    if (!tokenWithBearer || !tokenWithBearer.startsWith('Bearer')) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Unauthorized to access'
      );
    }

    const token = tokenWithBearer.split(' ')[1];
    const verifyUser = await TokenService.verifyToken(
      token,
      config.jwt.accessSecret as Secret,
      TokenType.ACCESS
    );

    if (verifyUser) {
      req.user = verifyUser;
    } else {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token.');
    }

    const user = await User.findById(verifyUser.userId);
    if (!user || user.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
    }
    if (user.isBlocked || user.isBanned) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Your account is blocked or banned.'
      );
    }
    if (roles.length) {
      const userRole = roleRights.get(verifyUser?.role);
      const hasRole = userRole?.some(role => roles.includes(role));
      if (!hasRole) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this API."
        );
      }
    }
    next();
  });

export default auth;
