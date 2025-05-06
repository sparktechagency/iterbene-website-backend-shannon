import { Model, Types } from 'mongoose';
import { Role } from '../../middlewares/roles';
import { IMaritalStatus, TGender, TUserStatus } from './user.constant';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
export type TUser = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  username: string;
  nickname: string;
  email: string;
  phoneNumber?: string;
  password: string;
  aboutMe: string;
  profilePicture?: string;
  coverPicture?: string;
  status: TUserStatus;
  location?: {
    latitude: number;
    longitude: number;
  };
  locationName?: string;
  address?: string;
  country?: string;
  city?: string;
  state?: string;
  gender?: TGender;
  age?: number;
  maritalStatus?: IMaritalStatus;
  profession?: string;
  description?: string;
  role: Role;
  isEmailVerified: boolean;
  isBanned: boolean;
  banUntil?: Date | null;
  isOnline: boolean;
  isDeleted: boolean;
  isBlocked: boolean;
  lastPasswordChange: Date;
  isResetPassword: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
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
