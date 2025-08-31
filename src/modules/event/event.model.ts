import { model, Schema } from 'mongoose';
import { EventPrivacy, IEvent, IEventModel } from './event.interface';
import paginate from '../../common/plugins/paginate';

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
    // Calculate the difference in days
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    // Ensure dates are at the start of the day to avoid time-based discrepancies
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Calculate duration in days
    const durationInMs = end.getTime() - start.getTime();
    const durationInDays = Math.ceil(durationInMs / (1000 * 60 * 60 * 24));

    // If same day event, duration should be 1
    this.duration = durationInDays === 0 ? 1 : durationInDays + 1;
  }
  next();
});

// Add paginate plugin
eventSchema.plugin(paginate);

// Create indexes
eventSchema.index({ _id: 1, participants: 1 });

export const Event = model<IEvent, IEventModel>('Event', eventSchema);
