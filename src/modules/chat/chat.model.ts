import mongoose, { Schema } from 'mongoose';
import { ChatType, IChat, IChatModel } from './chat.interface';
import paginate from '../../common/plugins/paginate';

const chatSchema = new Schema<IChat, IChatModel>(
  {
    chatType: {
      type: String,
      enum: [ChatType.GROUP, ChatType.SINGLE],
      required: [true, 'Chat type is required'],
      default: ChatType.SINGLE,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Participants are required'],
      },
    ],
    chatName: {
      type: String,
      trim: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);


chatSchema.plugin(paginate);

const Chat = mongoose.model<IChat, IChatModel>('Chat', chatSchema);
export default Chat;
