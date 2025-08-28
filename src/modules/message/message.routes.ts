import { Router } from 'express';
import fileUploadHandler from '../../shared/fileUploadHandler';
import { MESSAGE_UPLOADS_FOLDER } from './message.constant';
import { MessageController } from './message.controller';
import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
import { fullAuth } from '../../middlewares/smartAuth';
const upload = fileUploadHandler(MESSAGE_UPLOADS_FOLDER);

const router = Router();

// unviewed message count
router.get(
  '/unviewed-count',
  fullAuth('Common'),
  MessageController.unviewedMessagesCount
);

// send message
router
  .route('/')
  .post(
    fullAuth('Common'),
    upload.array('files', 10),
    convertHeicToPngMiddleware(MESSAGE_UPLOADS_FOLDER),
    MessageController.sendMessage
  );

// get all messages by receiverId
router.get(
  '/:receiverId',
  fullAuth('Common'),
  MessageController.getAllMessagesByReceiverId
);

// get single message
router
  .route('/:messageId')
  .put(fullAuth('Common'), MessageController.updateMessage)
  .patch(fullAuth('Common'), MessageController.markMessageSeen)
  .delete(fullAuth('Common'), MessageController.deleteMessage);

// Additional routes for new features
router.patch(
  '/view-all-messages/:chatId',
  fullAuth('Common'),
  MessageController.viewAllMessages
);
router.post(
  '/reaction/:messageId',
  fullAuth('Common'),
  MessageController.addReaction
);
router.delete(
  '/reaction/:messageId',
  fullAuth('Common'),
  MessageController.removeReaction
);
router.post('/reply', fullAuth('Common'), MessageController.replyToMessage);

router.post(
  '/:messageId/forward',
  fullAuth('Common'),
  MessageController.forwardMessage
);
router.post(
  '/:messageId/pin/:chatId',
  fullAuth('Common'),
  MessageController.pinMessage
);
router.post(
  '/:messageId/unpin/:chatId',
  fullAuth('Common'),
  MessageController.unpinMessage
);

router.get('/:chatId/search', fullAuth('Common'), MessageController.searchMessages);

router.post(
  '/:chatId/typing',
  fullAuth('Common'),
  MessageController.sendTypingIndicator
);
router.post(
  '/:chatId/stop-typing',
  fullAuth('Common'),
  MessageController.stopTypingIndicator
);

export const MessageRoutes = router;
