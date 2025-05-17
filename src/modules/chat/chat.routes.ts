import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ChatController } from './chat.controller';

const router = Router();

router
  .route('/group-chat')
  .post(auth('common'), ChatController.createGroupChat);

router
  .route('/')
  .get(auth('common'), ChatController.getAllChatsByUserId)
  .post(auth('common'), ChatController.createSingleChat);

router
  .route('/:chatId')
  .get(auth('common'), ChatController.getSingleChat)
  .delete(auth('common'), ChatController.deleteChat);

// Additional routes for group chat management
router.post(
  '/:chatId/participants',
  auth('common'),
  ChatController.addParticipantToGroup
);
router.delete(
  '/:chatId/participants',
  auth('common'),
  ChatController.removeParticipantFromGroup
);
router.patch(
  '/:chatId/settings',
  auth('common'),
  ChatController.updateGroupSettings
);

export const ChatRoutes = router;
