import { Schema, model } from 'mongoose';
import {
  IUserInteractionLog,
  IUserInteractionLogModal,
} from './userInteractionLog.interface';
import paginate from '../../common/plugins/paginate';

const userInteractionLogSchema = new Schema<
  IUserInteractionLog,
  IUserInteractionLogModal
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    statusCode: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

//apply pagination plugin if needed
userInteractionLogSchema.plugin(paginate);
// Add indexes for better query performance
userInteractionLogSchema.index({ userId: 1, createdAt: -1 });

export const UserInteractionLog = model<
  IUserInteractionLog,
  IUserInteractionLogModal
>('UserInteractionLog', userInteractionLogSchema);
