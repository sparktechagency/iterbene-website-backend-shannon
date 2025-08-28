import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { User } from '../user/user.model';
import { IChat } from './chat.interface';
import Chat from './chat.model';
import Message from '../message/message.model';
import { Types } from 'mongoose';
import { MessageService } from '../message/message.service';

const getAllChatsByUserId = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IChat>> => {
  let userId: string | null = null;

  if (filters?.userName) {
    const escapedUserName = filters.userName.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
    const user = await User.findOne({
      username: { $regex: new RegExp(escapedUserName, 'i') },
    }).select('_id');

    if (!user) {
      return {
        results: [],
        totalResults: 0,
        limit: options.limit || 10,
        page: options.page || 1,
        totalPages: 0,
      };
    }
    userId = user._id.toString();
  }

  const query: Record<string, any> = {
    participants: { $all: [filters.senderId] },
    isDeleted: false,
  };

  if (userId) {
    query.participants.$all.push(userId);
  }
  options.populate = [
    {
      path: 'participants',
      select: 'firstName lastName username email profileImage',
    },
    {
      path: 'lastMessage',
    },
  ];

  options.sortBy = options.sortBy || 'updatedAt';
  options.sortOrder = 1;
  const result = await Chat.paginate(query, options);
  const chatsWithUnviewedCount = await Promise.all(
    result.results.map(async chat => {
      const unviewedCount = await MessageService.unviewedMessagesCount(
        filters?.senderId,
        chat && chat._id ? chat._id.toString() : ''
      );
      return {
        //@ts-ignore
        ...chat.toObject(),
        unviewedCount,
      };
    })
  );
  return {
    ...result,
    results: chatsWithUnviewedCount,
  };
};

const getChatById = async (chatId: string): Promise<IChat | null> => {
  return Chat.findOne({ _id: chatId, isDeleted: false })
    .populate('lastMessage')
    .lean();
};

const createSingleChat = async (
  senderId: string,
  receiverId: string
): Promise<IChat | null> => {
  const receiverUser = await User.findById(receiverId);
  if (!receiverUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver user not found');
  }
  const existingChat = await Chat.findOne({
    chatType: 'single',
    participants: { $all: [senderId, receiverId] },
  })
    .populate('lastMessage')
    .lean();
  if (existingChat) {
    return existingChat;
  }
  const newChat = new Chat({
    chatType: 'single',
    participants: [senderId, receiverId],
  });
  await newChat.save();
  const chatData = await Chat.findById(newChat?._id)
    .populate('lastMessage')
    .lean();
  return chatData;
};

const checkSenderIdExistInChat = async (
  senderId: string,
  receiverId: string
) => {
  //chekc
  const chat = await Chat.findOne({
    chatType: 'single',
    participants: { $all: [senderId, receiverId] },
    isDeleted: false,
  });
  return chat;
};
const createGroupChatService = async (
  chatName: string,
  participantIds: string[],
  groupAdmin: string
): Promise<IChat> => {
  const newChat = new Chat({
    chatType: 'group',
    chatName,
    participants: [groupAdmin, ...participantIds],
    groupAdmin,
    isGroupChat: true,
  });
  const savedChat = await newChat.save();
  return savedChat.toObject();
};

const deleteChat = async (chatId: string): Promise<IChat | null> => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  chat.isDeleted = true;
  await chat.save();

  await Message.updateMany(
    { chatId: new Types.ObjectId(chatId) },
    { isDeleted: true }
  );
  return chat;
};

const addParticipantToGroup = async (
  chatId: string,
  userId: string,
  adminId: string
): Promise<IChat | null> => {
  const chat = await Chat.findById(chatId);
  if (!chat || chat.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  if (!chat.isGroupChat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Not a group chat');
  }
  if (!chat.groupAdmin || chat.groupAdmin.toString() !== adminId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only group admin can add participants'
    );
  }
  if (!chat.groupSettings?.allowAddParticipants) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Adding participants is disabled'
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  chat.participants.push(new Types.ObjectId(userId));
  await chat.save();

  return chat;
};

const removeParticipantFromGroup = async (
  chatId: string,
  userId: string,
  adminId: string
): Promise<IChat | null> => {
  const chat = await Chat.findById(chatId);
  if (!chat || chat.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  if (!chat.isGroupChat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Not a group chat');
  }
  if (!chat.groupAdmin || chat.groupAdmin.toString() !== adminId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only group admin can remove participants'
    );
  }
  if (!chat.groupSettings?.allowRemoveParticipants) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Removing participants is disabled'
    );
  }

  chat.participants = chat.participants.filter(
    participant => participant.toString() !== userId
  );
  await chat.save();

  return chat;
};

const updateGroupSettings = async (
  chatId: string,
  settings: {
    allowAddParticipants?: boolean;
    allowRemoveParticipants?: boolean;
  },
  adminId: string
): Promise<IChat | null> => {
  const chat = await Chat.findById(chatId);
  if (!chat || chat.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  if (!chat.isGroupChat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Not a group chat');
  }
  if (!chat.groupAdmin || chat.groupAdmin.toString() !== adminId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only group admin can update settings'
    );
  }

  chat.groupSettings = {
    allowAddParticipants:
      settings.allowAddParticipants !== undefined
        ? settings.allowAddParticipants
        : chat.groupSettings?.allowAddParticipants ?? false,
    allowRemoveParticipants:
      settings.allowRemoveParticipants !== undefined
        ? settings.allowRemoveParticipants
        : chat.groupSettings?.allowRemoveParticipants ?? false,
  };
  await chat.save();

  return chat;
};

export const ChatService = {
  getAllChatsByUserId,
  getChatById,
  createSingleChat,
  checkSenderIdExistInChat,
  createGroupChatService,
  deleteChat,
  addParticipantToGroup,
  removeParticipantFromGroup,
  updateGroupSettings,
};
