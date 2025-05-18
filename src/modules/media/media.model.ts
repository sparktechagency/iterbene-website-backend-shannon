import { Schema, model, Types } from 'mongoose';
import { IMedia, MediaType, SourceType } from './media.interface';

const mediaSchema = new Schema<IMedia>(
  {
    sourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    sourceType: {
      type: String,
      enum: Object.values(SourceType),
      required: true,
    },
    mediaType: {
      type: String,
      enum: Object.values(MediaType),
      required: true,
    },
    mediaUrl: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number,
    },
    textContent: {
      type: String,
      trim: true,
    },
    metadata: {
      resolution: { type: String },
      fileSize: { type: Number },
    },
    altText: {
      type: String,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
    },

    expiresAt: {
      type: Date,
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

mediaSchema.index({ sourceId: 1, sourceType: 1 });
mediaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index to auto-delete expired media

export const Media = model<IMedia>('Media', mediaSchema);
