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

// Define sortedReactionSchema
const sortedReactionSchema = new Schema<ISortedReaction>({
  type: { type: String, enum: Object.values(ReactionType), required: true },
  count: { type: Number, default: 0 },
});

// Define reactionSchema
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

// Define commentReactionSchema
const commentReactionSchema = new Schema<ICommentReaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  commentId: { type: Schema.Types.ObjectId, required: true }, // No ref needed since it's an embedded ID
  reactionType: {
    type: String,
    enum: Object.values(ReactionType),
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Define commentSchema
const commentSchema = new Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  replyTo: { type: Schema.Types.ObjectId, ref: 'User' }, // Reference to the user being replied to
  parentCommentId: { type: Schema.Types.ObjectId }, // No ref, just ObjectId for parent comment
  comment: { type: String, required: true },
  // mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  reactions: [commentReactionSchema],
  // replies: [{ type: Schema.Types.ObjectId }], // No ref, just ObjectId for nested replies
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Define postSchema
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
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
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

// Add paginate plugin
postSchema.plugin(paginate);

// Create indexes
postSchema.index({ userId: 1, postType: 1, privacy: 1, isDeleted: 1 });
postSchema.index({ sourceId: 1, postType: 1, isDeleted: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ media: 1 });

// Register the Post model
export const Post = model<IPost, IPostModel>('Post', postSchema);
