import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IStory {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  mediaIds: Types.ObjectId[]; 
  privacy: string;
  viewedBy: Types.ObjectId[];
  viewCount: number;
  reactions: Array<{
    userId: Types.ObjectId;
    reactionType: string;
  }>;
  replies: Array<{
    userId: Types.ObjectId;
    message: string;
    createdAt: Date;
  }>;
  status: string;
  expiresAt: Date;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum StoryPrivacy {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  CUSTOM = 'custom',
}

export enum StoryStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  WOW = 'wow',
}

export interface IStoryModel extends Model<IStory> {
    paginate(filter: Record<string, any>, options: PaginateOptions): Promise<PaginateResult<IStory>>
}