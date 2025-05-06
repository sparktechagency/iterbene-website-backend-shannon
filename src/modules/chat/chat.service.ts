import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { User } from '../user/user.model';
import { IChat } from './chat.interface';
import Chat from './chat.model';

const getAllChatsByUserId = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IChat>> => {
  let userId: string | null = null;

  // If userName is provided, find the corresponding user ID
  if (filters?.userName) {
    const escapedUserName = filters.userName.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    ); // Escape special characters
    const user = await User.findOne({
      fullName: { $regex: new RegExp(escapedUserName, 'i') }, // Case-insensitive search
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

  // Construct the query
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
      select: 'fullName email profileImage',
    },
    {
      path: 'lastMessage'
    },
  ];

  options.sortBy = options.sortBy || '-updatedAt';
  const result = await Chat.paginate(query, options);
  return result;
};

const getChatById = async (chatId: string): Promise<IChat | null> => {
  return Chat.findOne({ _id: chatId, isDeleted: false })
    .populate('lastMessage')
    .lean();
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
const createSingleChat = async (
  senderId: string,
  receiverId: string
): Promise<IChat | null> => {
  // check receiver user exist in database
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
const createGroupChatService = async (
  chatName: string,
  participantIds: string[],
  groupAdmin: string
) => {
  const newChat = new Chat({
    chatType: 'group',
    chatName,
    participants: [groupAdmin, ...participantIds],
    groupAdmin,
  });
  const savedChat = await newChat.save();
  return savedChat.toObject();
};

const deleteChat = async (chatId: string) => {
  const isExistChat = await Chat.findById(chatId);
  if (!isExistChat) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  isExistChat.isDeleted = true;
  await isExistChat.save();
  return isExistChat;
};

export const ChatService = {
  getAllChatsByUserId,
  getChatById,
  createSingleChat,
  createGroupChatService,
  checkSenderIdExistInChat,
  deleteChat,
};
