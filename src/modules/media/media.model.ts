import { Schema, model } from 'mongoose';
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
