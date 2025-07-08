import { Schema, model } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import {
  IComment,
  ICommentReaction,
  IPost,
  IPostModel,
  IReaction,
  ISortedReaction,
  PostPrivacy,
  PostType,
  ReactionType,
} from './post.interface';

const sortedReactionSchema = new Schema<ISortedReaction>({
  type: { type: String, enum: Object.values(ReactionType), required: true },
  count: { type: Number, default: 0 },
});

const reactionSchema = new Schema<IReaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  reactionType: {
    type: String,
    enum: Object.values(ReactionType),
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const commentReactionSchema = new Schema<ICommentReaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
  reactionType: {
    type: String,
    enum: Object.values(ReactionType),
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const commentSchema = new Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Comment' },
  parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
  comment: { type: String, required: true },
  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Added for user mentions
  reactions: [commentReactionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const visitedLocationSchema = new Schema<{
  latitude: number;
  longitude: number;
}>({
  latitude: { type: Number, required: false },
  longitude: { type: Number, required: false },
});

const postSchema = new Schema<IPost, IPostModel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sourceId: {
    type: Schema.Types.ObjectId,
    refPath: 'postType',
  },
  postType: {
    type: String,
    enum: Object.values(PostType),
    required: true,
  },
  content: {
    type: String,
    default: '',
    trim: true,
  },
  media: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Media',
    },
  ],
  sortedReactions: [sortedReactionSchema],
  visitedLocation: {
    type: visitedLocationSchema,
    required: false,
  },
  visitedLocationName: {
    type: String,
    required: false,
  },
  privacy: {
    type: String,
    enum: Object.values(PostPrivacy),
    required: true,
    default: PostPrivacy.PUBLIC,
  },
  itinerary: {
    type: Schema.Types.ObjectId,
    ref: 'Itinerary',
  },
  hashtags: [
    {
      type: String,
      index: true,
    },
  ],
  shareCount: { type: Number, default: 0 },
  isShared: { type: Boolean, default: false },
  originalPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
  itineraryViewCount: { type: Number, default: 0 },
  reactions: [reactionSchema],
  comments: [commentSchema],
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

postSchema.index({ visitedLocation: '2dsphere' });

postSchema.plugin(paginate);

export const Post = model<IPost, IPostModel>('Post', postSchema);