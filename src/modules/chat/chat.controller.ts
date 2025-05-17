import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { ChatService } from './chat.service';
import pick from '../../shared/pick';
import { Request, Response } from 'express';
import { User } from '../user/user.model';
import ApiError from '../../errors/ApiError';

const getAllChatsByUserId = catchAsync(async (req: Request, res: Response) => {
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

const getSingleChat = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const result = await ChatService.getChatById(chatId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Chat fetched successfully',
    data: result,
  });
});

const createSingleChat = catchAsync(async (req: Request, res: Response) => {
  const senderId = req.user.userId;
  const { receiverId } = req.body;
  if (!receiverId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Receiver ID is required');
  }
  const user = await User.findById(receiverId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver user not found');
  }
  const chat = await ChatService.createSingleChat(senderId, receiverId);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'New chat created successfully',
    data: chat,
  });
});

const createGroupChat = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { chatName, participantIds } = req.body;
  const chat = await ChatService.createGroupChatService(chatName, participantIds, userId);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'New group chat created successfully',
    data: chat,
  });
});

const deleteChat = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const chat = await ChatService.deleteChat(chatId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Chat deleted successfully',
    data: chat,
  });
});

const addParticipantToGroup = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  const adminId = req.user.userId;
  const chat = await ChatService.addParticipantToGroup(chatId, userId, adminId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Participant added successfully',
    data: chat,
  });
});

const removeParticipantFromGroup = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  const adminId = req.user.userId;
  const chat = await ChatService.removeParticipantFromGroup(chatId, userId, adminId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Participant removed successfully',
    data: chat,
  });
});

const updateGroupSettings = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const settings = pick(req.body, ['allowAddParticipants', 'allowRemoveParticipants']);
  const adminId = req.user.userId;
  const chat = await ChatService.updateGroupSettings(chatId, settings, adminId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Group settings updated successfully',
    data: chat,
  });
});

export const ChatController = {
  getAllChatsByUserId,
  createSingleChat,
  createGroupChat,
  getSingleChat,
  deleteChat,
  addParticipantToGroup,
  removeParticipantFromGroup,
  updateGroupSettings,
};