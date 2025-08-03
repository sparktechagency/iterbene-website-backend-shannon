import { Types } from "mongoose";
import { PostPrivacy, PostType, ReactionType } from "../modules/post/post.interface";

export interface CreatePostPayload {
  userId: Types.ObjectId;
  content?: string;
  files?: Express.Multer.File[];
  itineraryId?: string;
  postType: PostType;
  privacy: PostPrivacy;
  sourceId?: string;
  visitedLocation?: { latitude: number; longitude: number };
  visitedLocationName?: string;
}

export interface SharePostPayload {
  userId: Types.ObjectId;
  originalPostId: string;
  content?: string;
  privacy: PostPrivacy;
}

export interface AddOrRemoveReactionPayload {
  userId: Types.ObjectId;
  postId: string;
  reactionType: ReactionType;
}

export interface AddOrRemoveCommentReactionPayload {
  userId: Types.ObjectId;
  postId: string;
  commentId: string;
  reactionType: ReactionType;
}

export interface CreateCommentPayload {
  userId: Types.ObjectId;
  postId: string;
  comment: string;
  replyTo?: string; // User ID being replied to
  parentCommentId?: string; // Parent comment ID for nested replies
  mentions?: string[]; // Array of usernames to mention
}

export interface UpdateCommentPayload {
  userId: Types.ObjectId;
  postId: string;
  commentId: string;
  comment: string;
  mentions?: string[]; // Array of usernames to mention
}

export interface DeleteCommentPayload {
  userId: Types.ObjectId;
  postId: string;
  commentId: string;
}
