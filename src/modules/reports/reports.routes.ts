import { Router } from 'express';
import { ReportController } from './reports.controllers';
import validateRequest from '../../shared/validateRequest';
import { ReportValidation } from './reports.validation';
import { fullAuth } from '../../middlewares/smartAuth';
const router = Router();

router
  .route('/send-warning-message')
  .post(
    fullAuth('Admin'),
    validateRequest(ReportValidation.sendWarningMessageValidationSchema),
    ReportController.sendWarningMessageForReportedUser
  );

router.patch(
  '/users/:userId/ban',
  fullAuth('Admin'),
  validateRequest(ReportValidation.banUserValidationSchema),
  ReportController.banUser
);

router.patch(
  '/users/:userId/unban',
  fullAuth('Admin'),
  validateRequest(ReportValidation.unbanUserValidationSchema),
  ReportController.unbanUser
);

router
  .route('/')
  .get(fullAuth('Admin'), ReportController.getAllReports)
  .post(
    fullAuth('Common'),
    validateRequest(ReportValidation.addReportValidationSchema),
    ReportController.addReport
  );

router
  .route('/:reportId')
  .get(fullAuth('Admin'), ReportController.getSingleReport);

export const ReportRoutes = router;