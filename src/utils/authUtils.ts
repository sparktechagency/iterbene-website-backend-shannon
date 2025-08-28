import { TUser } from '../modules/user/user.interface';
import { TokenType, isValidTokenType } from '../modules/token/token.interface';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

export interface AuthValidation {
  isValid: boolean;
  error?: string;
}

export class AuthUtils {
  /**
   * Validates user account status
   */
  static validateUserStatus(user: TUser): AuthValidation {
    if (user?.isDeleted) {
      return {
        isValid: false,
        error: 'User account is deleted.'
      };
    }
    
    if (user?.isBlocked) {
      return {
        isValid: false,
        error: 'User account is blocked.'
      };
    }
    
    if (user?.isBanned && user?.banUntil && user.banUntil > new Date()) {
      return {
        isValid: false,
        error: `User account is banned until ${user.banUntil.toLocaleString()}`
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validates token type
   */
  static validateTokenType(type: string): TokenType {
    if (!isValidTokenType(type)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid token type.');
    }
    return type;
  }

  /**
   * Extracts token from Authorization header or cookies
   */
  static extractToken(authHeader?: string, cookies?: any): string | null {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    
    if (cookies?.accessToken) {
      return cookies.accessToken;
    }
    
    return null;
  }

  /**
   * Checks if user has required permissions
   */
  static hasPermission(userRights: string[], requiredRights: string[]): boolean {
    return requiredRights.some(right => userRights.includes(right));
  }

  /**
   * Gets cookie configuration based on environment
   */
  static getCookieConfig(isProduction: boolean, maxAge: number) {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      maxAge,
      path: '/'
    };
  }

  /**
   * Validates password strength
   */
  static validatePasswordStrength(password: string): AuthValidation {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return {
        isValid: false,
        error: `Password must be at least ${minLength} characters long.`
      };
    }

    if (!hasUpperCase) {
      return {
        isValid: false,
        error: 'Password must contain at least one uppercase letter.'
      };
    }

    if (!hasLowerCase) {
      return {
        isValid: false,
        error: 'Password must contain at least one lowercase letter.'
      };
    }

    if (!hasNumbers) {
      return {
        isValid: false,
        error: 'Password must contain at least one number.'
      };
    }

    if (!hasSpecialChar) {
      return {
        isValid: false,
        error: 'Password must contain at least one special character.'
      };
    }

    return { isValid: true };
  }
}