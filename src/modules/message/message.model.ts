import mongoose, { Schema, Document, Model } from 'mongoose';
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
          enum: Object.values(MessageType), // Supports all message types
          required: [true, 'Message type is required'],
          default: MessageType.TEXT,
        },
        text: {
          type: String,
          trim: true,
        },
        fileUrls: {
          type: [String], // Supports multiple files (images, audio, video, PDFs)
          validate: {
            validator: (urls: string[]) =>
              Array.isArray(urls) && urls.length <= 10,
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

    unsentBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// Indexing for better query performance
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

// Add pagination plugin
messageSchema.plugin(paginate);

const Message = mongoose.model<IMessage, IMessageModel>(
  'Message',
  messageSchema
);
export default Message;
