import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IStoryMedia {
  _id: Types.ObjectId;
  mediaUrl: string;
  textContent?: string;
  textFontFamily?: string;
  backgroundColor?: string;
  expiresAt?: Date;
  mediaType: StoryMediaType;
  viewedBy: Types.ObjectId[];
  viewCount: number;
  reactions: Array<{
    userId: Types.ObjectId;
    reactionType: ReactionType;
  }>;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStory {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  mediaIds: IStoryMedia[];
  privacy: string;
  status: string;
  expiresAt: Date;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum StoryMediaType {
  TEXT = 'text',
  MIXED = 'mixed',
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
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
  paginate(
    filter: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IStory>>;
}
