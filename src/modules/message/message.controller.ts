import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { MessageService } from './message.service';
import pick from '../../shared/pick';
import { Request, Response } from 'express';
import { MessageType } from './message.interface';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { chatId, receiverId, text, messageType } = req.body;
  const files = req.files as Express.Multer.File[];

  const fileUrls = files?.map((file) => file.path) || [];

  const payload: any = {
    chatId,
    senderId: userId,
    receiverId,
    content: {
      messageType: messageType || (fileUrls.length ? MessageType.MIXED : MessageType.TEXT),
      text,
      fileUrls,
    },
  };

  const message = await MessageService.sendMessage(payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message sent successfully',
    data: message,
  });
});

const getAllMessagesByReceiverId = catchAsync(async (req: Request, res: Response) => {
  const senderId = req.user.userId;
  const { receiverId } = req.params;
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const messages = await MessageService.getAllMessagesByReceiverId(
    { senderId, receiverId },
    options
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Messages fetched successfully',
    data: messages,
  });
});

const updateMessage = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { text } = req.body;
  const message = await MessageService.updateMessage(messageId, text);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message updated successfully',
    data: message,
  });
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user.userId;
  const message = await MessageService.deleteMessage(userId, messageId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message deleted successfully',
    data: message,
  });
});

const markMessageSeen = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user.userId;
  const message = await MessageService.markMessageSeen(messageId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message marked as seen',
    data: message,
  });
});

const viewAllMessages = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const messages = await MessageService.viewAllMessages(chatId, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Messages fetched successfully',
    data: messages,
  });
});

const unviewedMessagesCount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { chatId } = req.query;
  const count = await MessageService.unviewedMessagesCount(userId, chatId as string);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Unviewed messages count fetched successfully',
    data: { count },
  });
});

const addReaction = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user.userId;
  const message = await MessageService.addReaction(messageId, userId, emoji);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Reaction added successfully',
    data: message,
  });
});

const removeReaction = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user.userId;
  const message = await MessageService.removeReaction(messageId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Reaction removed successfully',
    data: message,
  });
});

const replyToMessage = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { replyToId, chatId, receiverId, content } = req.body;
  const message = await MessageService.replyToMessage(
    {
      chatId,
      senderId: userId,
      receiverId,
      content,
    },
    replyToId
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Reply sent successfully',
    data: message,
  });
});

const forwardMessage = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { chatIds } = req.body;
  const userId = req.user.userId;
  const messages = await MessageService.forwardMessage(messageId, userId, chatIds);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message forwarded successfully',
    data: messages,
  });
});

const pinMessage = catchAsync(async (req: Request, res: Response) => {
  const { messageId, chatId } = req.params;
  const message = await MessageService.pinMessage(messageId, chatId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message pinned successfully',
    data: message,
  });
});

const unpinMessage = catchAsync(async (req: Request, res: Response) => {
  const { messageId, chatId } = req.params;
  const message = await MessageService.unpinMessage(messageId, chatId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message unpinned successfully',
    data: message,
  });
});

const searchMessages = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { searchTerm } = req.query;
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const messages = await MessageService.searchMessages(chatId, searchTerm as string, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Messages searched successfully',
    data: messages,
  });
});

const sendTypingIndicator = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user.userId;
  await MessageService.sendTypingIndicator(chatId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Typing indicator sent',
    data: {},
  });
});

const stopTypingIndicator = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user.userId;
  await MessageService.stopTypingIndicator(chatId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Typing indicator stopped',
    data: {},
  });
});

export const MessageController = {
  sendMessage,
  getAllMessagesByReceiverId,
  updateMessage,
  deleteMessage,
  markMessageSeen,
  viewAllMessages,
  unviewedMessagesCount,
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