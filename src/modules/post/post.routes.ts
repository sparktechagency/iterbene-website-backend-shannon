import { Router } from 'express';
import fileUploadHandler from '../../shared/fileUploadHandler';
import validateRequest from '../../shared/validateRequest';
import { PostController } from './post.controller';
import { PostValidation } from './post.validation';
import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
import { fullAuth } from '../../middlewares/smartAuth';

const UPLOADS_POST_FOLDER = 'uploads/posts';
const upload = fileUploadHandler(UPLOADS_POST_FOLDER);

const router = Router();

// create post
router
  .route('/')
  .post(
    fullAuth('Common'),
    upload.array('postFiles', 10),
    convertHeicToPngMiddleware(UPLOADS_POST_FOLDER),
    validateRequest(PostValidation.createPostValidationSchema),
    PostController.createPost
  );

// Share post
router.post(
  '/share',
  fullAuth('Common'),
  validateRequest(PostValidation.sharePostValidationSchema),
  PostController.sharePost
);

//get feed posts
router.get('/feed', PostController.feedPosts);

//incrementItineraryViewCount
router.post(
  '/increment-itinerary-view-count',
  fullAuth('Common'),
  PostController.incrementItineraryViewCount
);

// get user timeline post
router.get(
  '/user-timeline/:username',
  fullAuth('Common'),
  PostController.getUserTimelinePosts
);
// get group timeline post
router.get('/group/:groupId', fullAuth('Common'), PostController.getGroupPosts);

// get event timeline post
router.get('/event/:eventId', fullAuth('Common'), PostController.getEventPosts);

// Reaction routes

//add or remove reaction
router.post(
  '/reaction',
  fullAuth('Common'),
  validateRequest(PostValidation.addOrRemoveReactionValidationSchema),
  PostController.addOrRemoveReaction
);

//add or remove comment reaction
router.post(
  '/comment-reaction',
  fullAuth('Common'),
  validateRequest(PostValidation.addOrRemoveCommentReactionValidationSchema),
  PostController.addOrRemoveCommentReaction
);

// Comment routes

//create comment
router.post(
  '/comment',
  fullAuth('Common'),
  validateRequest(PostValidation.createCommentValidationSchema),
  PostController.createComment
);

//update  comment
router.patch(
  '/comment/:commentId',
  fullAuth('Common'),
  validateRequest(PostValidation.updateCommentValidationSchema),
  PostController.updateComment
);

//delete comment
router.delete(
  '/comment/:commentId',
  fullAuth('Common'),
  validateRequest(PostValidation.deleteCommentValidationSchema),
  PostController.deleteComment
);

// get visited posts
router.get(
  '/visited-posts',
  fullAuth('Common'),
  PostController.getVisitedPostsWithDistance
);

// single post routes
router
  .route('/:postId')
  // get single post
  .get(PostController.getPostById)
  // update post
  .patch(
    fullAuth('Common'),
    upload.array('postFiles', 10),
    convertHeicToPngMiddleware(UPLOADS_POST_FOLDER),
    validateRequest(PostValidation.updatePostValidationSchema),
    PostController.updatePost
  )
  // delete post
  .delete(fullAuth('Common'), PostController.deletePost);

export const PostRoutes = router;
