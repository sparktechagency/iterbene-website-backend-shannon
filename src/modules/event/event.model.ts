import { model, Schema } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { EventPrivacy, IEvent, IEventModel } from './event.interface';

const eventSchema = new Schema<IEvent, IEventModel>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    eventImage: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    duration: {
      type: Number,
      default: 0,
    },
    locationName: {
      type: String,
      trim: true,
    },
    privacy: {
      type: String,
      enum: Object.values(EventPrivacy),
      default: EventPrivacy.PUBLIC,
    },
    coHosts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    eventCost: {
      type: Number,
      default: 0,
    },
    interestedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    pendingInterestedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    interestCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate duration
eventSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    // Extract only date parts (ignore time completely)
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    // Calculate difference in days
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      this.duration = 1; 
    } else {
      this.duration = diffDays;
    }
  }
  next();
});
// Add paginate plugin
eventSchema.plugin(paginate);

// Create indexes
eventSchema.index({ _id: 1, participants: 1 });

export const Event = model<IEvent, IEventModel>('Event', eventSchema);
