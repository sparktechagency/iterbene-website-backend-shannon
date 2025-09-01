import { Router } from 'express';
import { ChatController } from './chat.controller';
import auth from '../../middlewares/auth';

const router = Router();

router
  .route('/group-chat')
  .post(auth('Common'), ChatController.createGroupChat);

router
  .route('/')
  .get(auth('Common'), ChatController.getAllChatsByUserId)
  .post(auth('Common'), ChatController.createSingleChat);

router
  .route('/:chatId')
  .get(auth('Common'), ChatController.getSingleChat)
  .delete(auth('Common'), ChatController.deleteChat);

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
