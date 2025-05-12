import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface ISortedReaction {
  type: string;
  count: number;
}

export interface IReaction {
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  reactionType: ReactionType;
  createdAt: Date;
  updatedAt: Date;
}

export interface IComment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  replyTo?: Types.ObjectId;
  parentCommentId?: Types.ObjectId;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPost {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sourceId?: Types.ObjectId; // Group or Event ID
  postType: PostType;
  content: string;
  media: Types.ObjectId[]; // References to IMedia
  sortedReactions: ISortedReaction[];
  visitedLocation?: {
    latitude: number;
    longitude: number;
  };
  visitedLocationName?: string;
  privacy: PostPrivacy;
  itinerary?: Types.ObjectId; // Optional itinerary reference
  hashtags: string[];
  shareCount: number;
  isShared: boolean;
  originalPostId?: Types.ObjectId; // For shared posts
  itineraryViewCount: number;
  reactions: IReaction[];
  comments: IComment[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPostModel extends Model<IPost> {
  paginate(
    filters: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IPost>>;
}

export enum ReactionType {
  LOVE = 'love',
  LUGGAGE = 'luggage',
  BAN = 'ban',
  SMILE = 'smile',
}

export enum PostPrivacy {
  PUBLIC = 'public',
  FRIENDS = 'friends',
  PRIVATE = 'private',
}

export enum PostType {
  TIMELINE = 'timeline',
  GROUP = 'group',
  EVENT = 'event',
}
