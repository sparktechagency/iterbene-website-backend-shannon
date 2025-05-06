import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { ChatService } from './chat.service';
import pick from '../../shared/pick';
import { User } from '../user/user.model';
import ApiError from '../../errors/ApiError';

const getAllChatsByUserId = catchAsync(async (req, res) => {
  const senderId = req.user.userId;
  const filters = pick(req.query, ['userName']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  filters.senderId = senderId;
  const chats = await ChatService.getAllChatsByUserId(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Chats fetched successfully',
    data: chats,
  });
});

const getSingleChat = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const result = await ChatService.getChatById(chatId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Chat fetched successfully',
    data: result,
  });
});
const createSingleChat = catchAsync(async (req, res) => {
  const senderId = req.user.userId;
  const { receiverId } = req.body;
  if (!receiverId) {
    throw new Error('Receiver ID is required');
  }
  const user = await User.findById(receiverId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver user not found');
  }
  const chat = await ChatService.createSingleChat(senderId, receiverId);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'new chat created successfully',
    data: chat,
  });
});

const createGroupChat = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const { chatName, participantIds } = req.body;
  const chat = await ChatService.createGroupChatService(
    chatName,
    participantIds,
    userId
  );
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'new group chat created successfully',
    data: chat,
  });
});

const deleteChat = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  await ChatService.deleteChat(chatId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Chat deleted successfully',
    data: {},
  });
});

export const ChatController = {
  getAllChatsByUserId,
  createSingleChat,
  createGroupChat,
  getSingleChat,
  deleteChat,
};
