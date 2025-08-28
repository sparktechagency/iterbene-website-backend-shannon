import express from 'express';
import { BlockedUserController } from './blockedUsers.controller';
import { fullAuth } from '../../middlewares/smartAuth';

const router = express.Router();

router.post(
  '/block/:blockedId',
  fullAuth('Common'),
  BlockedUserController.blockUser
);
router.post(
  '/unblock/:blockedId',
  fullAuth('Common'),
  BlockedUserController.unblockUser
);
router.get(
  '/my-block-users',
  fullAuth('Common'),
  BlockedUserController.getBlockedUsers
);

export const BlockedUserRoutes = router;
