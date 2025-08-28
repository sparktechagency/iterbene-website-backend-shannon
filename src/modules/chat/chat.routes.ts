import { Router } from 'express';

import { ChatController } from './chat.controller';
import { fullAuth } from '../../middlewares/smartAuth';

const router = Router();

router
  .route('/group-chat')
  .post(fullAuth('Common'), ChatController.createGroupChat);

router
  .route('/')
  .get(fullAuth('Common'), ChatController.getAllChatsByUserId)
  .post(fullAuth('Common'), ChatController.createSingleChat);

router
  .route('/:chatId')
  .get(fullAuth('Common'), ChatController.getSingleChat)
  .delete(fullAuth('Common'), ChatController.deleteChat);

// Additional routes for group chat management
router.post(
  '/:chatId/participants',
  fullAuth('Common'),
  ChatController.addParticipantToGroup
);
router.delete(
  '/:chatId/participants',
  fullAuth('Common'),
  ChatController.removeParticipantFromGroup
);
router.patch(
  '/:chatId/settings',
  fullAuth('Common'),
  ChatController.updateGroupSettings
);

export const ChatRoutes = router;
