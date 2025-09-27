import { Schema, model } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import {
  IActivity,
  IDay,
  IItinerary,
  ItineraryModel,
} from './Itinerary.interface';

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
  overAllRating: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

itinerarySchema.plugin(paginate);
//calculate overall rating
// Helper function to calculate overall rating
function calculateOverallRating(days: IDay[]): number {
  if (!days || !Array.isArray(days) || days.length === 0) {
    return 0;
  }

  let totalRating = 0;
  let totalActivities = 0;

  days.forEach((day: IDay) => {
    if (day.activities && Array.isArray(day.activities)) {
      day.activities.forEach((activity: IActivity) => {
        if (activity?.rating && activity.rating > 0) {
          totalRating += activity.rating;
          totalActivities++;
        }
      });
    }
  });

  if (totalActivities === 0) {
    return 0;
  }

  // Return average rating rounded to 2 decimal places
  return Math.round((totalRating / totalActivities) * 100) / 100;
}

// Pre-save hook for document save operations
itinerarySchema.pre('save', function (next) {
  try {
    // Only calculate if days field exists and is modified (or new document)
    if (this.isNew || this.isModified('days')) {
      this.overAllRating = calculateOverallRating(this.days);
    }
  } catch (error) {
    this.overAllRating = 0;
  }
  next();
});

// Pre-hook for update operations
itinerarySchema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  function (next) {
    try {
      const update = this.getUpdate() as Partial<IItinerary>;

      // Only calculate if days field is being updated
      if (update && update.days) {
        const overAllRating = calculateOverallRating(update.days);
        this.set({ overAllRating });
      }
    } catch (error) {
      this.set({ overAllRating: 0 });
    }
    next();
  }
);
export const Itinerary = model<IItinerary, ItineraryModel>(
  'Itinerary',
  itinerarySchema
);
