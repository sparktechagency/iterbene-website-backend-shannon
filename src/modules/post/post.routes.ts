import { Router } from 'express';
import auth from '../../middlewares/auth';
import { PostController } from './post.controller';
import fileUploadHandler from '../../shared/fileUploadHandler';
const UPLOADS_FOLDER = 'uploads/posts';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = Router();

router
  .route('/')
  .post(auth('User'), upload.array('postFiles', 10), PostController.createPost);

router.post('/share', auth('User'), PostController.sharePost);
router.get('/feed', PostController.feedPosts);
router.get('/timeline', PostController.getTimelinePosts);
router.get('/group/:groupId', PostController.getGroupPosts);
router.get('/event/:eventId', PostController.getEventPosts);

// Reaction routes
router.post('/reaction', auth('User'), PostController.addOrRemoveReaction);

// Comment routes
router.post('/comment', auth('User'), PostController.createComment);
router.patch(
  '/comment/:commentId',
  auth('User'),
  PostController.updateComment
);
router.delete(
  '/comment/:commentId',
  auth('User'),
  PostController.deleteComment
);

export const PostRoutes = router;
