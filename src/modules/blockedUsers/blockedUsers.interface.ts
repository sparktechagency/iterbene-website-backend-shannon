import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IBlockedUser {
  blockerId: Types.ObjectId; 
  blockedId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlockedUserModel extends Model<IBlockedUser> {
  paginate(
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IBlockedUser>>;
}
