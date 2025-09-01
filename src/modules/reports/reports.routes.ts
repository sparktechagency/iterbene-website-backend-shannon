import { Router } from 'express';
import { ReportController } from './reports.controllers';
import validateRequest from '../../shared/validateRequest';
import { ReportValidation } from './reports.validation';
import auth from '../../middlewares/auth';
const router = Router();

router
  .route('/send-warning-message')
  .post(
    auth('Admin'),
    validateRequest(ReportValidation.sendWarningMessageValidationSchema),
    ReportController.sendWarningMessageForReportedUser
  );

router.patch(
  '/users/:userId/ban',
  auth('Admin'),
  validateRequest(ReportValidation.banUserValidationSchema),
  ReportController.banUser
);

router.patch(
  '/users/:userId/unban',
  auth('Admin'),
  validateRequest(ReportValidation.unbanUserValidationSchema),
  ReportController.unbanUser
);

router
  .route('/')
  .get(auth('Admin'), ReportController.getAllReports)
  .post(
    auth('Common'),
    validateRequest(ReportValidation.addReportValidationSchema),
    ReportController.addReport
  );

router
  .route('/:reportId')
  .get(auth('Admin'), ReportController.getSingleReport);

export const ReportRoutes = router;