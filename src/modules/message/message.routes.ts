import { Router } from 'express';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../shared/fileUploadHandler';
import { MESSAGE_UPLOADS_FOLDER } from './message.constant';
import { MessageController } from './message.controller';
const upload = fileUploadHandler(MESSAGE_UPLOADS_FOLDER);

const router = Router();


// unviewed message count
router.get(
  '/unviewed-count',
  auth('Common'),
  MessageController.unviewedMessagesCount
);

// send message
router
  .route('/')
  .post(auth('User'), upload.array('files', 10), MessageController.sendMessage);

  // get all messages by receiverId
router.get(
  '/:receiverId',
  auth('Common'),
  MessageController.getAllMessagesByReceiverId
);

// get single message
router
  .route('/:messageId')
  .put(auth('User'), MessageController.updateMessage)
  .patch(auth('User'), MessageController.markMessageSeen)
  .delete(auth('User'), MessageController.deleteMessage);


// Additional routes for new features
router.patch(
  '/view-all-messages/:chatId',
  auth('Common'),
  MessageController.viewAllMessages
);
router.post(
  '/reaction/:messageId',
  auth('Common'),
  MessageController.addReaction
);
router.delete(
  '/reaction/:messageId',
  auth('Common'),
  MessageController.removeReaction
);
router.post('/reply', auth('Common'), MessageController.replyToMessage);


router.post(
  '/:messageId/forward',
  auth('Common'),
  MessageController.forwardMessage
);
router.post(
  '/:messageId/pin/:chatId',
  auth('Common'),
  MessageController.pinMessage
);
router.post(
  '/:messageId/unpin/:chatId',
  auth('Common'),
  MessageController.unpinMessage
);

router.get('/:chatId/search', auth('Common'), MessageController.searchMessages);


router.post(
  '/:chatId/typing',
  auth('Common'),
  MessageController.sendTypingIndicator
);
router.post(
  '/:chatId/stop-typing',
  auth('Common'),
  MessageController.stopTypingIndicator
);

export const MessageRoutes = router;
