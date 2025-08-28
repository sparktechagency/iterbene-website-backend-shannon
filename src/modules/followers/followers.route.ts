import express from 'express';
import { FollowerController } from './followers.controller';
import { fullAuth } from '../../middlewares/smartAuth';

const router = express.Router();

router.post('/follow', fullAuth('Common'), FollowerController.followUser);
router.post('/unfollow', fullAuth('Common'), FollowerController.unfollowUser);
router.get('/followers', fullAuth('Common'), FollowerController.getFollowers);
router.get('/following', fullAuth('Common'), FollowerController.getFollowing);

export const FollowerRoutes = router;