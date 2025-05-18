import { Schema, model, Types } from 'mongoose';
import {
  IStory,
  StoryPrivacy,
  StoryStatus,
  ReactionType,
  IStoryModel,
} from './story.interface';
import paginate from '../../common/plugins/paginate';

const storySchema = new Schema<IStory, IStoryModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    privacy: {
      type: String,
      enum: Object.values(StoryPrivacy),
      default: StoryPrivacy.PUBLIC,
    },
    viewedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
    reactions: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        reactionType: {
          type: String,
          enum: Object.values(ReactionType),
        },
      },
    ],
    replies: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        message: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: Object.values(StoryStatus),
      default: StoryStatus.ACTIVE,
    },
    backgroundColor: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

storySchema.index({ userId: 1, expiresAt: 1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-remove expired stories
storySchema.plugin(paginate);

export const Story = model<IStory, IStoryModel>('Story', storySchema);
