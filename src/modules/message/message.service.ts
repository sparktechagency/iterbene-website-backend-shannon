import { StatusCodes } from 'http-status-codes';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import Chat from '../chat/chat.model';
import { IMessage } from './message.interface';
import Message from './message.model';

const getAllMessagesByReceiverId = async (
  filter: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IMessage>> => {
  const query = {
    $or: [
      { senderId: filter.senderId, receiverId: filter.receiverId },
      { senderId: filter.receiverId, receiverId: filter.senderId },
    ],
  };

  options.populate = [
    {
      path: 'senderId',
      select: 'fullName profileImage email',
    },
    {
      path: 'receiverId',
      select: 'fullName profileImage email',
    },
  ];
  options.sortBy = options.sortBy || 'createdAt';
  const result = await Message.paginate(query, options);
  return result;
};

const sendMessage = async (payload: IMessage): Promise<IMessage> => {
  const newMessage = await Message.create(payload);
  if (payload.chatId) {
    const chat = await Chat.findOne({ _id: payload.chatId, isDeleted: false });
    if (chat) {
      chat.lastMessage = newMessage?.id;
      chat.updatedAt = newMessage?.createdAt;
      await chat.save();
    }
  }
  //send socket message  to message
  const messageEvent = `new-message::${payload?.receiverId}`;
  //@ts-ignore
  io.emit(messageEvent, {
    code: StatusCodes.OK,
    message: 'Message sent successfully',
    data: newMessage,
  });
  //sent socket to chat
  //@ts-ignore
  // io.to(payload?.receiverId).emit('new-chat', {
  //   code: StatusCodes.OK,
  //   message: 'Updated chat sent successfully',
  //   data: updateChat,
  // });
  return newMessage;
};

const markMessageSeen = async (messageId: string, userId: string) => {
  return Message.findByIdAndUpdate(messageId, {
    $addToSet: { seenBy: userId },
  });
};

const markMessageDeleted = async (messageId: string, userId: string) => {
  const message = await Message.findByIdAndUpdate(messageId, {
    $addToSet: { deletedBy: userId },
  });
  const updateMessageEvent = `${message?.chatId}::${message?.receiverId}`;
  //@ts-ignore
  io.emit(updateMessageEvent, {
    code: StatusCodes.OK,
    message: 'Message deleted successfully',
    data: message,
  });
  return message;
};

const markMessageUnsent = async (messageId: string, userId: string) => {
  return Message.findByIdAndUpdate(messageId, {
    $addToSet: { unsentBy: userId },
  });
};

export const MessageService = {
  getAllMessagesByReceiverId,
  sendMessage,
  markMessageSeen,
  markMessageDeleted,
  markMessageUnsent,
};
