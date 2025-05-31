import { Schema, model } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { IItinerary, ItineraryModel } from './Itinerary.interface';

const activitySchema = new Schema({
  time: { type: String, required: true },
  description: { type: String, required: true },
  link: String,
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  duration: String,
  cost: { type: Number, required: false },
});

const daySchema = new Schema({
  dayNumber: { type: Number, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  activities: [activitySchema],
  locationName: { type: String, required: true },
  comment: String,
  weather: String,
});

const itinerarySchema = new Schema<IItinerary, ItineraryModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  tripName: { type: String, required: true },
  travelMode: { type: String, required: true },
  departure: { type: String, required: true },
  arrival: { type: String, required: true },
  days: [daySchema],
  isDeleted: { type: Boolean, default: false },
  overAllRating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

itinerarySchema.plugin(paginate);
//calculate overall rating
itinerarySchema.pre('save', function (next) {
  this.overAllRating = this.days.reduce((acc, day) => {
    return (
      acc +
      day.activities.reduce((acc, activity) => {
        return acc + (activity?.rating ?? 0);
      }, 0)
    );
  }, 0);
  next();
});

export const Itinerary = model<IItinerary, ItineraryModel>(
  'Itinerary',
  itinerarySchema
);
