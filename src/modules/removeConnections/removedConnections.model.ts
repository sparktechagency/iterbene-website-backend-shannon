import mongoose, { Schema } from 'mongoose';
import { IRemovedConnection } from './removedConnections.interface';
const removedConnectionSchema = new Schema<IRemovedConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    removedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    removedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index to automatically expire removed connections after 30 days (optional)
removedConnectionSchema.index(
  { removedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

export const RemovedConnection = mongoose.model<IRemovedConnection>(
  'RemovedConnection',
  removedConnectionSchema
);
