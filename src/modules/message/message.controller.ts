import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { MessageService } from './message.service';
import pick from '../../shared/pick';
import { Request, Response } from 'express';
import { IContent, IMessage, MessageType } from './message.interface';
import { ChatService } from '../chat/chat.service';
import ApiError from '../../errors/ApiError';

const sendMessage = catchAsync(async (req, res) => {
  const senderId = req.user.userId;
  const { message, receiverId } = req.body;
  let chatId: string = '';
  // Check if an existing chat exists
  const existingChat = await ChatService.checkSenderIdExistInChat(
    senderId,
    receiverId
  );
  if (existingChat) {
    chatId = existingChat._id;
  } else {
    // Create a new chat if none exists
    const newChat = await ChatService.createSingleChat(senderId, receiverId);
    if (!newChat) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chat Not Found');
    }
    chatId = newChat._id as string;
  }

  // Prepare message content
  const content: IContent = {
    messageType: MessageType.TEXT,
    text: message || '', // Ensure message is set or empty string
    fileUrls: [], // Initialize fileUrls as an empty array
  };

  // Handle file uploads (supporting multiple files)
  if (Array.isArray(req.files) && req.files.length > 0) {
    req.files.forEach(file => {
      const fileUrl = `/uploads/messages/${file.filename}`;
      if (content.fileUrls) {
        content.fileUrls.push(fileUrl);
      }

      // Detect message type based on file type
      if (file.mimetype.startsWith('image/')) {
        content.messageType = MessageType.IMAGE;
      } else if (file.mimetype.startsWith('audio/')) {
        content.messageType = MessageType.AUDIO;
      } else if (file.mimetype.startsWith('video/')) {
        content.messageType = MessageType.VIDEO;
      } else if (file.mimetype === 'application/pdf') {
        content.messageType = MessageType.DOCUMENT;
      }
    });

    // If there are files but no text, clear the text field
    if (
      content &&
      content.fileUrls &&
      content.fileUrls.length > 0 &&
      !message
    ) {
      content.text = '';
    } else {
      content.messageType = MessageType.MIXED; // Supports both text and files
    }
  }

  // Ensure chatId is not null
  if (!chatId) {
    throw new Error('chatId is required and could not be determined.');
  }

  // Construct the message payload
  const payload: IMessage = {
    chatId,
    senderId,
    receiverId,
    content,
  };

  // Send message via the service
  const result = await MessageService.sendMessage(payload);

  // Send success response
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message sent successfully',
    data: result,
  });
});

const getAllMessagesByReceiverId = catchAsync(
  async (req: Request, res: Response) => {
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
  }
);

const updateMessage = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { message } = req.body;
  const result = await MessageService.updateMessage(messageId, message);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message updated successfully',
    data: result,
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
  const { userId } = req.user;
  const { chatId } = req.params;

  const messages = await MessageService.viewAllMessages(chatId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Messages viewed successfully',
    data: messages,
  });
});

const unviewedMessagesCount = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user;
    const { chatId } = req.query;
    const count = await MessageService.unviewedMessagesCount(
      userId,
      chatId as string
    );
    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Unviewed messages count fetched successfully',
      data: { count },
    });
  }
);

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
  const messages = await MessageService.forwardMessage(
    messageId,
    userId,
    chatIds
  );
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
  const messages = await MessageService.searchMessages(
    chatId,
    searchTerm as string,
    options
  );
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
