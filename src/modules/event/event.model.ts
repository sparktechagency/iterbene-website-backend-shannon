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
      days: { type: Number },
      nights: { type: Number },
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

// Indexes
eventSchema.index({ creatorId: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ location: '2dsphere' });

//add paginate plugin
eventSchema.plugin(paginate);
export const Event = model<IEvent, IEventModel>('Event', eventSchema);
