import { model, Schema } from 'mongoose';
import { INotification, INotificationModal } from './notification.interface';
import paginate from '../../common/plugins/paginate';

const notificationModel = new Schema<INotification>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User is required'],
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User is required'],
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      required: true,
    },
    image: {
      type: Object,
    },
    type: {
      type: String,
      enum: [
        'post',
        'story',
        'comment',
        'event',
        'group',
        'connection',
        'message',
      ],
      required: [true, 'Type is required'],
    },
    linkId: {
      type: String,
    },
    viewStatus: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationModel.plugin(paginate);

export const Notification = model<INotification, INotificationModal>(
  'Notification',
  notificationModel
);
