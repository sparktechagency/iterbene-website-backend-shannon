import express from 'express';
import auth from '../../middlewares/auth';
import { FollowerController } from './followers.controller';

const router = express.Router();

router.post('/follow', auth('Common'), FollowerController.followUser);
router.post('/unfollow', auth('Common'), FollowerController.unfollowUser);
router.get('/followers', auth('Common'), FollowerController.getFollowers);
router.get('/following', auth('Common'), FollowerController.getFollowing);

export const FollowerRoutes = router;