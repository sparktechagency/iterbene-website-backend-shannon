import mongoose, { Schema, Types } from 'mongoose';
import {
  ISavedPostItinerary,
  ISavedPostItineraryModel,
} from './savedPostItinerary.interface';
import paginate from '../../common/plugins/paginate';

const savedPostItineraryModel = new Schema<
  ISavedPostItinerary,
  ISavedPostItineraryModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// apply plugin
savedPostItineraryModel.plugin(paginate);

const SavedPostItinerary = mongoose.model<
  ISavedPostItinerary,
  ISavedPostItineraryModel
>('SavedPostItinerary', savedPostItineraryModel);

export default SavedPostItinerary;
