import { Router } from 'express';
import auth from '../../middlewares/auth';
import { MessageController } from './message.controller';
import fileUploadHandler from '../../shared/fileUploadHandler';

const UPLOADS_FOLDER = 'uploads/messages';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = Router();

router
  .route('/')
  .post(
    auth('common'),
    upload.array('files', 10),
    MessageController.sendMessage
  );

router.get(
  '/:receiverId',
  auth('common'),
  MessageController.getAllMessagesByReceiverId
);

router
  .route('/:messageId')
  .put(auth('common'), MessageController.updateMessage)
  .patch(auth('common'), MessageController.markMessageSeen)
  .delete(auth('common'), MessageController.deleteMessage);

// Additional routes for new features
router.get(
  '/:chatId/messages',
  auth('common'),
  MessageController.viewAllMessages
);
router.get(
  '/unviewed-count',
  auth('common'),
  MessageController.unviewedMessagesCount
);
router.post(
  '/:messageId/reaction',
  auth('common'),
  MessageController.addReaction
);
router.delete(
  '/:messageId/reaction',
  auth('common'),
  MessageController.removeReaction
);
router.post('/reply', auth('common'), MessageController.replyToMessage);
router.post(
  '/:messageId/forward',
  auth('common'),
  MessageController.forwardMessage
);
router.post(
  '/:messageId/pin/:chatId',
  auth('common'),
  MessageController.pinMessage
);
router.post(
  '/:messageId/unpin/:chatId',
  auth('common'),
  MessageController.unpinMessage
);
router.get('/:chatId/search', auth('common'), MessageController.searchMessages);
router.post(
  '/:chatId/typing',
  auth('common'),
  MessageController.sendTypingIndicator
);
router.post(
  '/:chatId/stop-typing',
  auth('common'),
  MessageController.stopTypingIndicator
);

export const MessageRoutes = router;
