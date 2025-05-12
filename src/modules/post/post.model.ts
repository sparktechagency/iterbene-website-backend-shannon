import { Schema, model } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { IPost, IPostModel, PostPrivacy, PostType, ReactionType } from './post.interface';

const sortedReactionSchema = new Schema({
  type: { type: String, enum: Object.values(ReactionType), required: true },
  count: { type: Number, default: 0 },
});

const reactionSchema = new Schema({
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

const commentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Comment' },
  parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const postSchema = new Schema<IPost,IPostModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceId: { type: Schema.Types.ObjectId, refPath: 'postType' },
  postType: { type: String, enum: Object.values(PostType), required: true },
  content: { type: String, default: '' },
  media: [{ type: Schema.Types.ObjectId, ref: 'Media' }],
  sortedReactions: [sortedReactionSchema],
  visitedLocation: {
    latitude: Number,
    longitude: Number,
  },
  visitedLocationName: String,
  privacy: { type: String, enum: Object.values(PostPrivacy), required: true },
  itinerary: { type: Schema.Types.ObjectId, ref: 'Itinerary' },
  hashtags: [{ type: String, index: true }],
  shareCount: { type: Number, default: 0 },
  isShared: { type: Boolean, default: false },
  originalPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
  itineraryViewCount: { type: Number, default: 0 },
  reactions: [reactionSchema],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

postSchema.plugin(paginate);

export const Post = model<IPost,IPostModel>('Post', postSchema);