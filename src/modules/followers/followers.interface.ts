import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IFollower {
  followerId: Types.ObjectId;
  followedId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFollowerModel extends Model<IFollower> {
  paginate(
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IFollower>>;
}
