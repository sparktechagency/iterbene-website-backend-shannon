import mongoose, { Schema } from 'mongoose';
import { IGroup, IGroupModel } from './group.interface';
import paginate from '../../common/plugins/paginate';

const GroupSchema = new Schema<IGroup, IGroupModel>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    locationName: {
      type: String,
      trim: true,
      required: false,
      default: '',
    },
    groupImage: {
      type: String,
      default: null,
    },
    privacy: {
      type: String,
      enum: ['public', 'private'],
      required: true,
    },
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    coLeaders: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    pendingMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    description: {
      type: String,
      trim: true,
      required: false,
      default: '',
    },
    location: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    participantCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

//add paginate plugin
GroupSchema.plugin(paginate);

const Group = mongoose.model<IGroup, IGroupModel>('Group', GroupSchema);

export default Group;
