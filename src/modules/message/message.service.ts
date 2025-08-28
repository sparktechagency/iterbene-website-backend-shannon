import { StatusCodes } from 'http-status-codes';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import Chat from '../chat/chat.model';
import { IMessage } from './message.interface';
import Message from './message.model';
import ApiError from '../../errors/ApiError';
import { User } from '../user/user.model';
import { Types } from 'mongoose';
import { NotificationService } from '../notification/notification.services';
import { INotification } from '../notification/notification.interface';
import { Notification } from '../notification/notification.model';
import { ChatService } from '../chat/chat.service';

// View all messages by receiver ID (aligned with GET /:receiverId)
const getAllMessagesByReceiverId = async (
  filter: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IMessage>> => {
  const query = {
    $or: [
      { senderId: filter.senderId, receiverId: filter.receiverId },
      { senderId: filter.receiverId, receiverId: filter.senderId },
    ],
    isDeleted: false,
  };

  // Update messages to mark them as seen by the receiver
  await Message.updateMany(
    {
      $or: [
        {
          senderId: new Types.ObjectId(filter.receiverId),
          receiverId: new Types.ObjectId(filter.senderId),
        },
      ],
      seenBy: { $nin: [new Types.ObjectId(filter.senderId)] },
      deliveryStatus: { $ne: 'seen' },
    },
    {
      $addToSet: { seenBy: new Types.ObjectId(filter?.senderId) },
      deliveryStatus: 'seen',
    }
  );
  options.populate = [
    {
      path: 'receiverId',
      select: 'firstName lastName profileImage email',
    },
    {
      path: 'replyTo',
      select: 'content senderId',
    },
    {
      path: 'forwardedFrom',
      select: 'content senderId',
    },
    {
      path: 'storyMedia'
    },
  ];
  options.sortBy = options.sortBy || 'createdAt';
  options.sortOrder = 1;
  options.reverse = true;
  const result = await Message.paginate(query, options);
  return result;
};

// View all messages in a chat
const viewAllMessages = async (chatId: string, receiverId: string) => {
  const result = await Message.updateMany(
    {
      chatId: new Types.ObjectId(chatId),
      receiverId: new Types.ObjectId(receiverId),
      deliveryStatus: 'sent',
      isDeleted: false,
    },
    { seenBy: [receiverId], deliveryStatus: 'seen' },
    { new: true }
  );
  return result;
};

// Count unviewed messages
const unviewedMessagesCount = async (
  userId: string,
  chatId?: string
): Promise<number> => {
  const query: Record<string, any> = {
    chatId: new Types.ObjectId(chatId),
    receiverId: new Types.ObjectId(userId),
    isDeleted: false,
    seenBy: { $nin: [userId] },
  };

  return Message.countDocuments(query);
};

// Send a message
const sendMessage = async (payload: IMessage) => {
  let chatId: string = '';
  // Check if an existing chat exists
  const existingChat = await ChatService.checkSenderIdExistInChat(
    payload.senderId.toString(),
    payload.receiverId.toString()
  );
  if (existingChat) {
    chatId = existingChat._id;
  } else {
    // Create a new chat if none exists
    const newChat = await ChatService.createSingleChat(
      payload.senderId.toString(),
      payload.receiverId.toString()
    );
    if (!newChat) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chat Not Found');
    }
    chatId = newChat._id as string;
  }

  // Set chatId in payload
  payload.chatId = new Types.ObjectId(chatId);
  const newMessage = await Message.create(payload);

  // Update last message in chat
  const chat = await Chat.findById(payload.chatId);
  if (chat) {
    chat.lastMessage = newMessage?.id;
    chat.updatedAt = newMessage?.createdAt;
    await chat.save();
  }
  const sender = await User.findById(payload.senderId);
  // Check if recipient is in message box
  const recipient = await User.findById(payload.receiverId);
  if (!recipient?.isInMessageBox || !recipient?.isOnline) {
    const notification: INotification = {
      title: `${sender?.firstName} ${sender?.lastName} sent you a message`,
      message: `You have a new message from ${sender?.firstName} ${sender?.lastName}`,
      senderId: new Types.ObjectId(payload.senderId),
      receiverId: new Types.ObjectId(payload.receiverId),
      linkId: sender?._id,
      image: sender?.profileImage,
      role: 'user',
      type: 'message',
      viewStatus: false,
    };

    // check if receiverId already has a notification message
    const existingNotification = await Notification.findOne({
      senderId: new Types.ObjectId(payload.senderId),
      receiverId: new Types.ObjectId(payload.receiverId),
      type: 'message',
      viewStatus: false,
    });
    if (!existingNotification) {
      await NotificationService.addCustomNotification(
        'message-notification',
        notification,
        new Types.ObjectId(payload.receiverId).toString()
      );
    }
  } else {
    // Mark message as seen if in message box
    await Message.updateOne(
      { _id: newMessage._id },
      { $addToSet: { seenBy: payload.receiverId }, deliveryStatus: 'seen' }
    );
    //@ts-ignore
    io.to(payload.receiverId).emit(`message-seen::${payload.chatId}`, {
      code: StatusCodes.OK,
      message: 'Message marked as seen',
      data: newMessage,
    });
  }

  const updateChat = await Chat.findById(payload.chatId).populate([
    {
      path: 'participants',
      select: 'firstName lastName email profileImage',
    },
    {
      path: 'lastMessage',
    },
  ]);
  const unviewedCount = await MessageService.unviewedMessagesCount(
    new Types.ObjectId(payload.receiverId).toString(),
    chat && chat._id ? chat._id.toString() : ''
  );
  const message = await Message.findById(newMessage?.id).populate([
    {
      path: 'receiverId',
      select: 'firstName lastName profileImage email',
    },
  ]);

  // Send socket events
  //@ts-ignore
  io.to(payload?.receiverId).emit('new-message', {
    code: StatusCodes.OK,
    message: 'Message sent successfully',
    data: message,
  });
  //@ts-ignore
  io.to(payload?.receiverId).emit('new-chat', {
    code: StatusCodes.OK,
    message: 'Updated chat sent successfully',
    data: {
      ...updateChat?.toObject(),
      unviewedCount,
    },
  });

  return message;
};

// Update message
const updateMessage = async (
  messageId: string,
  text: string
): Promise<IMessage | null> => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found');
  }
  message.content.text = text;
  await message.save();
  return message;
};

// Delete message
const deleteMessage = async (
  userId: string,
  messageId: string
): Promise<IMessage | null> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found');
  }
  if (message.senderId.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not allowed to delete this message'
    );
  }
  message.isDeleted = true;
  await message.save();
  return message;
};

// Mark message as seen
const markMessageSeen = async (
  messageId: string,
  userId: string
): Promise<IMessage | null> => {
  const message = await Message.findByIdAndUpdate(
    messageId,
    {
      $addToSet: { seenBy: new Types.ObjectId(userId) },
      deliveryStatus: 'seen',
    },
    { new: true }
  );

  if (message && message.chatId) {
    const seenEvent = `message-seen::${message.chatId}`;
    //@ts-ignore
    io.emit(seenEvent, {
      code: StatusCodes.OK,
      message: 'Message marked as seen',
      data: message,
    });
  }

  return message;
};

// Update delivery status
const updateDeliveryStatus = async (
  messageId: string,
  status: 'delivered' | 'seen'
): Promise<IMessage | null> => {
  const message = await Message.findByIdAndUpdate(
    messageId,
    { deliveryStatus: status },
    { new: true }
  );

  if (message && message.chatId) {
    const deliveryEvent = `delivery-status::${message.chatId}`;
    //@ts-ignore
    io.emit(deliveryEvent, {
      code: StatusCodes.OK,
      message: `Message ${status}`,
      data: { messageId, status },
    });
  }

  return message;
};

// Add reaction
const addReaction = async (
  messageId: string,
  userId: string,
  emoji: string
): Promise<IMessage | null> => {
  const message = await Message.findByIdAndUpdate(
    messageId,
    {
      $push: {
        reactions: { userId: new Types.ObjectId(userId), emoji },
      },
    },
    { new: true }
  );

  if (message && message.chatId) {
    const reactionEvent = `reaction-added::${message.chatId}`;
    //@ts-ignore
    io.emit(reactionEvent, {
      code: StatusCodes.OK,
      message: 'Reaction added',
      data: { messageId, userId, emoji },
    });
  }

  return message;
};

// Remove reaction
const removeReaction = async (
  messageId: string,
  userId: string
): Promise<IMessage | null> => {
  const message = await Message.findByIdAndUpdate(
    messageId,
    {
      $pull: {
        reactions: { userId: new Types.ObjectId(userId) },
      },
    },
    { new: true }
  );

  if (message && message.chatId) {
    const reactionEvent = `reaction-removed::${message.chatId}`;
    //@ts-ignore
    io.emit(reactionEvent, {
      code: StatusCodes.OK,
      message: 'Reaction removed',
      data: { messageId, userId },
    });
  }

  return message;
};

// Reply to a message
const replyToMessage = async (
  payload: IMessage,
  replyToId: string
): Promise<IMessage> => {
  const replyToMessage = await Message.findById(replyToId);
  if (!replyToMessage) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Message to reply to not found');
  }
  const newMessage = await Message.create({
    ...payload,
    replyTo: new Types.ObjectId(replyToId),
    deliveryStatus: 'sent',
  });

  if (payload.chatId) {
    const chat = await Chat.findById(payload.chatId);
    if (chat) {
      chat.lastMessage = new Types.ObjectId(newMessage._id);
      chat.updatedAt = newMessage.createdAt;
      await chat.save();
    }
  }

  const messageEvent = `new-message::${payload.chatId}`;
  //@ts-ignore
  io.emit(messageEvent, {
    code: StatusCodes.OK,
    message: 'Reply sent successfully',
    data: newMessage,
  });

  return newMessage;
};

// Forward a message
const forwardMessage = async (
  messageId: string,
  senderId: string,
  chatIds: string[]
): Promise<IMessage[]> => {
  const originalMessage = await Message.findById(messageId);
  if (!originalMessage) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found');
  }

  const forwardedMessages: IMessage[] = [];
  for (const chatId of chatIds) {
    const newMessage = await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(senderId),
      receiverId: originalMessage.receiverId,
      content: originalMessage.content,
      forwardedFrom: new Types.ObjectId(messageId),
      deliveryStatus: 'sent',
    });

    const chat = await Chat.findById(chatId);
    if (chat) {
      chat.lastMessage = new Types.ObjectId(newMessage._id);
      chat.updatedAt = newMessage.createdAt;
      await chat.save();
    }

    forwardedMessages.push(newMessage);

    const messageEvent = `new-message::${chatId}`;
    //@ts-ignore
    io.emit(messageEvent, {
      code: StatusCodes.OK,
      message: 'Message forwarded successfully',
      data: newMessage,
    });
  }

  return forwardedMessages;
};

// Pin a message
const pinMessage = async (
  messageId: string,
  chatId: string
): Promise<IMessage | null> => {
  const message = await Message.findByIdAndUpdate(
    messageId,
    { isPinned: true },
    { new: true }
  );

  if (message) {
    await Chat.findByIdAndUpdate(chatId, {
      $addToSet: { pinnedMessages: new Types.ObjectId(messageId) },
    });
  }

  return message;
};

// Unpin a message
const unpinMessage = async (
  messageId: string,
  chatId: string
): Promise<IMessage | null> => {
  const message = await Message.findByIdAndUpdate(
    messageId,
    { isPinned: false },
    { new: true }
  );

  if (message) {
    await Chat.findByIdAndUpdate(chatId, {
      $pull: { pinnedMessages: new Types.ObjectId(messageId) },
    });
  }

  return message;
};

// Search messages
const searchMessages = async (
  chatId: string,
  searchTerm: string,
  options: PaginateOptions
): Promise<PaginateResult<IMessage>> => {
  const query = {
    chatId: new Types.ObjectId(chatId),
    isDeleted: false,
    'content.text': { $regex: searchTerm, $options: 'i' },
  };

  options.populate = [
    {
      path: 'senderId',
      select: 'firstName lastName profileImage email',
    },
    {
      path: 'receiverId',
      select: 'firstName lastName profileImage email',
    },
  ];
  options.sortBy = options.sortBy || 'createdAt';
  return Message.paginate(query, options);
};

// Typing indicator
const sendTypingIndicator = async (chatId: string, userId: string) => {
  const typingEvent = `typing::${chatId}`;
  //@ts-ignore
  io.emit(typingEvent, {
    code: StatusCodes.OK,
    message: 'User is typing',
    data: { userId },
  });
};

// Stop typing indicator
const stopTypingIndicator = async (chatId: string, userId: string) => {
  const typingEvent = `stop-typing::${chatId}`;
  //@ts-ignore
  io.emit(typingEvent, {
    code: StatusCodes.OK,
    message: 'User stopped typing',
    data: { userId },
  });
};

export const MessageService = {
  getAllMessagesByReceiverId,
  viewAllMessages,
  unviewedMessagesCount,
  sendMessage,
  updateMessage,
  deleteMessage,
  markMessageSeen,
  updateDeliveryStatus,
  addReaction,
  removeReaction,
  replyToMessage,
  forwardMessage,
  pinMessage,
  unpinMessage,
  searchMessages,
  sendTypingIndicator,
  stopTypingIndicator,
};
