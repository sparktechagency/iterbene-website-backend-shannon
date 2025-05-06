import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import pick from '../../shared/pick';
import sendResponse from '../../shared/sendResponse';
import { MessageService } from './message.service';
import { ChatService } from '../chat/chat.service';
import { IContent, IMessage, MessageType } from './message.interface';
import ApiError from '../../errors/ApiError';

const getAllMessagesByReceiverId = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { receiverId } = req.params;
  const filters = pick(req.query, ['chatId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  if (!receiverId) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, 'Receiver id is required');
  }
  filters.senderId = userId;
  filters.receiverId = receiverId;

  console.log("Options", options);
  const result = await MessageService.getAllMessagesByReceiverId(
    filters,
    options
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Messages fetched successfully',
    data: result,
  });
});

const sendMessage = catchAsync(async (req, res) => {
  const senderId = req.user.userId;
  const { message, receiverId } = req.body;
  let chatId: string | null = null;
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
    chatId = newChat._id;
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

const markMessageSeen = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { messageId } = req.params;
  const result = await MessageService.markMessageSeen(messageId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Message marked as seen successfully',
    data: result,
  });
});

export const MessageController = {
  getAllMessagesByReceiverId,
  sendMessage,
  markMessageSeen,
};
