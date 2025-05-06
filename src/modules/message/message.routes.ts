import { Router } from 'express';
import auth from '../../middlewares/auth';
import { MessageController } from './message.controller';
import fileUploadHandler from '../../shared/fileUploadHandler';
const UPLOADS_FOLDER = 'uploads/messages';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = Router();

router
  .route('/')
  .post(
    auth('common'),
    upload.array('files', 10),
    MessageController.sendMessage
  );

router.get(
  '/:receiverId',
  auth('common'),
  MessageController.getAllMessagesByReceiverId
);

router
  .route('/:messageId')
  // .get(auth('common'), MessageController.getSingleMessage)
  .patch(auth('common'), MessageController.markMessageSeen);
// .delete(auth('common'), MessageController.deleteMessage);

export const MessageRoutes = router;
