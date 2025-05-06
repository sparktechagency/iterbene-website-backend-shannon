import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ReportController } from './reports.controllers';
import validateRequest from '../../shared/validateRequest';
import { ReportValidation } from './reports.validation';
import fileUploadHandler from '../../shared/fileUploadHandler';

const UPLOADS_FOLDER = 'uploads/reports';
const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = Router();

router
  .route('/send-waring-message')
  .post(auth('admin'), ReportController.sendWarningMessageForReportedUser);

router.post('/banned-user', auth('admin'), ReportController.banUser);

router.post('/unbanned-user', auth('admin'), ReportController.unbanUser);

router
  .route('/')
  .get(auth('admin'), ReportController.getAllReports)
  .post(
    auth('common'),
    upload.array('reportFiles', 10),
    validateRequest(ReportValidation.addReportValidationSchema),
    ReportController.addReport
  );

router
  .route('/:reportId')
  .get(auth('admin'), ReportController.getSingleReport);

export const ReportRoutes = router;
