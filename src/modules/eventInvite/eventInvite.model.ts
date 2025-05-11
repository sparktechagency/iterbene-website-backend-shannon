import { model, Schema } from 'mongoose';
import {
  EventInviteStatus,
  IEventInvite,
  IEventInviteModel,
} from './eventInvite.interface';
import paginate from '../../common/plugins/paginate';

const eventInviteSchema = new Schema<IEventInvite, IEventInviteModel>(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EventInviteStatus),
      default: EventInviteStatus.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
eventInviteSchema.index({ eventId: 1, to: 1 }, { unique: true });
eventInviteSchema.index({ from: 1 });
eventInviteSchema.index({ to: 1 });

// add paginate plugin
eventInviteSchema.plugin(paginate);

export const EventInvite = model<IEventInvite, IEventInviteModel>(
  'EventInvite',
  eventInviteSchema
);
