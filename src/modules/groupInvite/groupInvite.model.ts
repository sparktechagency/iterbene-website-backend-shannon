import mongoose, { Schema } from 'mongoose';
import { IGroupInvite, IGroupInviteModel } from './groupInvite.interface';

const GroupInviteSchema = new Schema<IGroupInvite,IGroupInviteModel>(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver ID is required'],
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
    toObject: {
      virtuals: true,
      versionKey: false,
    },
  }
);

const GroupInvite = mongoose.model<IGroupInvite,IGroupInviteModel>(
  'GroupInvite',
  GroupInviteSchema
);

export default GroupInvite;
