import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export type TUser = {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  username: string;
  nickname?: string;
  profilePicture?: string;
  coverPicture?: string;
  email: string;
  aboutMe?: string;
  password: string;
  passwordHistory: { hash: string; createdAt: Date }[];
  phoneNumber?: string;
  status: string;
  location?: { latitude: number; longitude: number };
  locationName?: string;
  address?: string;
  gender?: string;
  maritalStatus?: string;
  description?: string;
  role: string;
  profession?: string;
  age?: number;
  country?: string;
  city?: string;
  state?: string;
  isEmailVerified: boolean;
  referredAs?: string;
  isBanned: boolean;
  banUntil?: Date;
  isOnline: boolean;
  isDeleted: boolean;
  isBlocked: boolean;
  lastPasswordChange?: Date;
  isResetPassword: boolean;
  failedLoginAttempts: number;
  friends: Types.ObjectId[];
  blockedUsers: Types.ObjectId[];
  lockUntil?: Date;
  mfaSecret?: string;
  mfaEnabled: boolean;
};

export interface UserModal extends Model<TUser> {
  paginate: (
    filter: object,
    options: PaginateOptions
  ) => Promise<PaginateResult<TUser>>;
  isExistUserById(id: string): Promise<Partial<TUser> | null>;
  isExistUserByEmail(email: string): Promise<Partial<TUser> | null>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
}
