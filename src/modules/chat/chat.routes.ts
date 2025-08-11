import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ChatController } from './chat.controller';

const router = Router();

router
  .route('/group-chat')
  .post(auth('User'), ChatController.createGroupChat);

router
  .route('/')
  .get(auth('User'), ChatController.getAllChatsByUserId)
  .post(auth('User'), ChatController.createSingleChat);

router
  .route('/:chatId')
  .get(auth('User'), ChatController.getSingleChat)
  .delete(auth('User'), ChatController.deleteChat);

// Additional routes for group chat management
router.post(
  '/:chatId/participants',
  auth('Common'),
  ChatController.addParticipantToGroup
);
router.delete(
  '/:chatId/participants',
  auth('Common'),
  ChatController.removeParticipantFromGroup
);
router.patch(
  '/:chatId/settings',
  auth('Common'),
  ChatController.updateGroupSettings
);

export const ChatRoutes = router;
