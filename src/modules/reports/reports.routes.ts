import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ReportController } from './reports.controllers';
import validateRequest from '../../shared/validateRequest';
import { ReportValidation } from './reports.validation';
const router = Router();

router
  .route('/send-warning-message')
  .post(
    auth('admin'),
    validateRequest(ReportValidation.sendWarningMessageValidationSchema),
    ReportController.sendWarningMessageForReportedUser
  );

router.patch(
  '/users/:userId/ban',
  auth('admin'),
  validateRequest(ReportValidation.banUserValidationSchema),
  ReportController.banUser
);

router.patch(
  '/users/:userId/unban',
  auth('admin'),
  validateRequest(ReportValidation.unbanUserValidationSchema),
  ReportController.unbanUser
);

router
  .route('/')
  .get(auth('admin'), ReportController.getAllReports)
  .post(
    auth('common'),
    validateRequest(ReportValidation.addReportValidationSchema),
    ReportController.addReport
  );

router
  .route('/:reportId')
  .get(auth('admin'), ReportController.getSingleReport);

export const ReportRoutes = router;