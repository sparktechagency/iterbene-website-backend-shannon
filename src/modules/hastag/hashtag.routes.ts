import { Router } from 'express';
import { HashtagController } from './hashtag.controller';

const router = Router();

router.route('/').get(HashtagController.getHashtags);

// get hashtags posts
router.route('/posts').get(HashtagController.getHashtagPosts);

export const HashtagRoutes = router;
