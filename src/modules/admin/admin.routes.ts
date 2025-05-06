import { Router } from 'express';
import auth from '../../middlewares/auth';
import { AdminController } from './admin.controller';

const router = Router();

router
  .route('/get-dashboard-data')
  .get(auth('admin'), AdminController.getDashboardData);

export const AdminRoutes = router;
