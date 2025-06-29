import mongoose, { Schema } from 'mongoose';

interface IRemovedConnection {
  userId: mongoose.Types.ObjectId;
  removedUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const removedConnectionSchema = new Schema<IRemovedConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    removedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Removed User ID is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
removedConnectionSchema.index(
  { userId: 1, removedUserId: 1 },
  { unique: true }
);

// TTL index to automatically delete documents after 3 days
removedConnectionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 3 * 24 * 60 * 60 }
);

export const RemovedConnection = mongoose.model<IRemovedConnection>(
  'RemovedConnection',
  removedConnectionSchema
);
