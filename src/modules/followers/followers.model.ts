import { model, Schema } from 'mongoose';
import { IFollower, IFollowerModel } from './followers.interface';
import paginate from '../../common/plugins/paginate';

const followerSchema = new Schema<IFollower, IFollowerModel>(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    followedId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique follower-followed pair
followerSchema.index({ followerId: 1, followedId: 1 }, { unique: true });

followerSchema.plugin(paginate);

export const Follower = model<IFollower, IFollowerModel>(
  'Follower',
  followerSchema
);
