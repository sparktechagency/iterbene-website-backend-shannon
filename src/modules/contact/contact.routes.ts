import { Router } from 'express';
import { ContactController } from './contact.controller';
import validateRequest from '../../shared/validateRequest';
import { ContactValidation } from './contact.validation';

const router = Router();

router
  .route('/')
  .post(
    validateRequest(ContactValidation.createContactToAdminValidationSchema),
    ContactController.createContactToAdmin
  );

export const ContactRoutes = router;
