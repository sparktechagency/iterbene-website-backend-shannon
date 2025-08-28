import express from 'express';
import { StoryController } from './story.controller';
import validateRequest from '../../shared/validateRequest';
import { StoryValidation } from './story.validation';
import fileUploadHandler from '../../shared/fileUploadHandler';
import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
import { fullAuth } from '../../middlewares/smartAuth';
const STORY_UPLOADS_FOLDER = 'uploads/stories';
const upload = fileUploadHandler(STORY_UPLOADS_FOLDER);

const router = express.Router();

// Create a story (any fullAuthenticated user)
router.post(
  '/',
  fullAuth('Common'),
  upload.array('storyFiles', 10),
  convertHeicToPngMiddleware(STORY_UPLOADS_FOLDER),
  validateRequest(StoryValidation.createStoryValidationSchema),
  StoryController.createStory
);

// View a story (any fullAuthenticated user with access)
router.post(
  '/view',
  fullAuth('Common'),
  validateRequest(StoryValidation.viewStoryValidationSchema),
  StoryController.viewStory
);

// React to a story (any fullAuthenticated user with access)
router.post(
  '/react',
  fullAuth('Common'),
  validateRequest(StoryValidation.reactStoryValidationSchema),
  StoryController.reactToStory
);

// Reply to a story (any fullAuthenticated user with access)
router.post(
  '/reply',
  fullAuth('Common'),
  validateRequest(StoryValidation.replyStoryValidationSchema),
  StoryController.replyToStory
);

// Get story feed (any fullAuthenticated user)
router.get('/feed', fullAuth('Common'), StoryController.getStoryFeed);

// Get story viewers (creator only)
router.get(
  '/viewers/:mediaId',
  fullAuth('Common'),
  StoryController.getStoryViewers
);

// Get a story (any fullAuthenticated user with access)
router.route('/:storyId').get(fullAuth('Common'), StoryController.getStory);
router.route('/:mediaId').delete(fullAuth('Common'), StoryController.deleteStory);

export const StoryRoutes = router;
