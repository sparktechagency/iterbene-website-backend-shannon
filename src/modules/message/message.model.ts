import mongoose, { Schema } from 'mongoose';
import { IMessage, IMessageModel, MessageType } from './message.interface';
import paginate from '../../common/plugins/paginate';

const messageSchema = new Schema<IMessage, IMessageModel>(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver ID is required'],
    },
    content: {
      type: {
        messageType: {
          type: String,
          enum: Object.values(MessageType),
          required: [true, 'Message type is required'],
          default: MessageType.TEXT,
        },
        text: {
          type: String,
          trim: true,
        },
        fileUrls: {
          type: [String],
          validate: {
            validator: (urls: string[]) => Array.isArray(urls) && urls.length <= 10,
            message: 'Maximum 10 files are allowed per message',
          },
        },
      },
      required: [true, 'Message content is required'],
    },
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    unsentBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Added fields for new features
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: {
          type: String,
          trim: true,
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    deliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
  },
  { timestamps: true }
);

// Indexing for better query performance
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, createdAt: -1 });

// Add pagination plugin
messageSchema.plugin(paginate);

const Message = mongoose.model<IMessage, IMessageModel>('Message', messageSchema);
export default Message;