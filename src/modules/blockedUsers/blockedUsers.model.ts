import { model, Schema } from 'mongoose';
import { IBlockedUser, IBlockedUserModel } from './blockedUsers.interface';
import paginate from '../../common/plugins/paginate';

const blockedUserSchema = new Schema<IBlockedUser>(
  {
    blockerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blockedId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure unique blocker-blocked pair
blockedUserSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

// blockedUserSchema.plugin(paginate);
blockedUserSchema.plugin(paginate);

export const BlockedUser = model<IBlockedUser, IBlockedUserModel>(
  'BlockedUser',
  blockedUserSchema
);
