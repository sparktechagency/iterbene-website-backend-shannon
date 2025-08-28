import { Router } from 'express';
import { fullAuth } from '../../middlewares/smartAuth';
import { AdminController } from './admin.controller';

const router = Router();

router
  .route('/get-dashboard-data')
  .get(fullAuth('Admin'), AdminController.getDashboardData);

export const AdminRoutes = router;
