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

export interface ICommentReaction {
  userId: Types.ObjectId;
  commentId: Types.ObjectId;
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
  mentions?: Types.ObjectId[]; // Added for user mentions
  reactions: ICommentReaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPost {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sourceId?: Types.ObjectId;
  postType: PostType;
  content?: string;
  media: Types.ObjectId[];
  sortedReactions: ISortedReaction[];
  visitedLocation?: {
    latitude: number;
    longitude: number;
  };
  visitedLocationName?: string;
  privacy: PostPrivacy;
  itinerary?: Types.ObjectId;
  hashtags: string[];
  shareCount: number;
  isShared: boolean;
  originalPostId?: Types.ObjectId;
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
  USER = 'User',
  GROUP = 'Group',
  EVENT = 'Event',
}
