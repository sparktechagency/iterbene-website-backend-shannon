import { Schema, model, Types } from 'mongoose';
import {
  IStory,
  IStoryModel,
  StoryPrivacy,
  StoryStatus,
  ReactionType,
  StoryMediaType,
  IStoryMedia,
} from './story.interface';
import paginate from '../../common/plugins/paginate';

const storyMediaSchema = new Schema<IStoryMedia>(
  {
    mediaUrl: {
      type: String,
      // Now optional for both text and image stories
    },
    textContent: {
      type: String,
      // Text content for both text-only and image+text stories
    },
    textFontFamily: {
      type: String,
      enum: ['Arial', 'Arial Black', 'Courier New', 'Helvetica'],
      default: 'Arial',
    },
    backgroundColor: {
      type: String,
      // For text-only stories
    },
    textPosition: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      // For image+text stories, position of text overlay
    },
    textColor: {
      type: String,
      default: '#FFFFFF',
      // Text color for overlays
    },
    textSize: {
      type: Number,
      default: 24,
      // Text size for overlays
    },
    expiresAt: { type: Date, required: true },
    mediaType: {
      type: String,
      enum: Object.values(StoryMediaType),
      required: true,
    },
    viewedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    viewCount: { type: Number, default: 0 },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reactionType: {
          type: String,
          enum: Object.values(ReactionType),
          required: true,
        },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

storyMediaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const storySchema = new Schema<IStory, IStoryModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaIds: [{ type: Schema.Types.ObjectId, ref: 'StoryMedia' }],
    privacy: {
      type: String,
      enum: Object.values(StoryPrivacy),
      default: StoryPrivacy.PUBLIC,
    },
    status: {
      type: String,
      enum: Object.values(StoryStatus),
      default: StoryStatus.ACTIVE,
    },
    expiresAt: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

storySchema.index({ userId: 1, expiresAt: 1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.plugin(paginate);

export const StoryMedia = model<IStoryMedia>('StoryMedia', storyMediaSchema);
export const Story = model<IStory, IStoryModel>('Story', storySchema);
