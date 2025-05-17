import { Router } from 'express';
import auth from '../../middlewares/auth';
import { MessageController } from './message.controller';
import fileUploadHandler from '../../shared/fileUploadHandler';

const UPLOADS_FOLDER = 'uploads/messages';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = Router();


router.get(
  '/unviewed-count',
  auth('User'),
  MessageController.unviewedMessagesCount
);

router
  .route('/')
  .post(auth('User'), upload.array('files', 10), MessageController.sendMessage);

router.get(
  '/:receiverId',
  auth('User'),
  MessageController.getAllMessagesByReceiverId
);

router
  .route('/:messageId')
  .put(auth('User'), MessageController.updateMessage)
  .patch(auth('User'), MessageController.markMessageSeen)
  .delete(auth('User'), MessageController.deleteMessage);

// Additional routes for new features
router.patch(
  '/view-all-messages/:chatId',
  auth('User'),
  MessageController.viewAllMessages
);
router.post(
  '/reaction/:messageId',
  auth('User'),
  MessageController.addReaction
);
router.delete(
  '/reaction/:messageId',
  auth('User'),
  MessageController.removeReaction
);
router.post('/reply', auth('User'), MessageController.replyToMessage);
router.post(
  '/:messageId/forward',
  auth('User'),
  MessageController.forwardMessage
);
router.post(
  '/:messageId/pin/:chatId',
  auth('User'),
  MessageController.pinMessage
);
router.post(
  '/:messageId/unpin/:chatId',
  auth('User'),
  MessageController.unpinMessage
);
router.get('/:chatId/search', auth('User'), MessageController.searchMessages);
router.post(
  '/:chatId/typing',
  auth('User'),
  MessageController.sendTypingIndicator
);
router.post(
  '/:chatId/stop-typing',
  auth('User'),
  MessageController.stopTypingIndicator
);

export const MessageRoutes = router;
