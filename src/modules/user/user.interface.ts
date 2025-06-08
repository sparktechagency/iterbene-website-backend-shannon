import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export type TUser = {
  _id: Types.ObjectId;
  fullName?: string;
  username?: string;
  nickname?: string;
  profileImage?: string;
  coverImage?: string;
  email: string;
  password: string;
  phoneNumber?: string;
  status: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  locationName?: string;
  address?: string;
  gender?: string;
  maritalStatus?: string;
  description?: string;
  role: string;
  profession?: string;
  ageRange?: string;
  country?: string;
  city?: string;
  state?: string;
  referredAs?: string;
  isEmailVerified: boolean;
  isBanned: boolean;
  banUntil?: Date | null;
  isOnline: boolean;
  isDeleted: boolean;
  isBlocked: boolean;
  lastPasswordChange?: Date;
  isResetPassword: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  privacySettings: {
    ageRange: PrivacyVisibility;
    nickname: PrivacyVisibility;
    gender: PrivacyVisibility;
    location: PrivacyVisibility;
    locationName: PrivacyVisibility;
    country: PrivacyVisibility;
    city: PrivacyVisibility;
    state: PrivacyVisibility;
    profession: PrivacyVisibility;
    aboutMe: PrivacyVisibility;
    phoneNumber: PrivacyVisibility;
    maritalStatus: PrivacyVisibility;
  };
  connectionPrivacy: ConnectionPrivacy;
  createdAt?: Date;
  updatedAt?: Date;
};

export enum PrivacyVisibility {
  ONLY_ME = 'Only Me',
  PUBLIC = 'Public',
  FRIENDS = 'Friends',
}

// Define connection privacy options
export enum ConnectionPrivacy {
  PUBLIC = 'Public',
  FRIEND_TO_FRIEND = 'Friend to Friend',
}
export interface UserModal extends Model<TUser> {
  paginate: (
    filter: object,
    options: PaginateOptions
  ) => Promise<PaginateResult<TUser>>;
  isExistUserById(id: string): Promise<Partial<TUser> | null>;
  isExistUserByEmail(email: string): Promise<Partial<TUser> | null>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
}
