import { Router } from 'express';
import auth from '../../middlewares/auth';
import { MapsController } from './maps.controllers';

const router = Router();

router.get('/my-maps', auth('Common'), MapsController.myMaps);
router.post(
  '/add-interested-location',
  auth('Common'),
  MapsController.addInterestedLocation
);

export const MapsRoutes = router;
