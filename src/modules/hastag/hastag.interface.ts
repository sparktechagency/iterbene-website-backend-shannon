import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IHashtag {
  _id: string; // Hashtag name
  name: string;
  postCount: number;
  posts: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IHashtagModel extends Model<IHashtag> {
  paginate(
    filter: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IHashtag>>;
}