import { Router } from 'express';
import { AdminController } from './admin.controller';
import auth from '../../middlewares/auth';

const router = Router();

router
  .route('/get-dashboard-data')
  .get(auth('Admin'), AdminController.getDashboardData);

export const AdminRoutes = router;
