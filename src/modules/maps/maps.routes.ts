import { Router } from 'express';
import { MapsController } from './maps.controllers';
import auth from '../../middlewares/auth';

const router = Router();

router.get('/my-maps', auth('Common'), MapsController.myMaps);
router.post(
  '/add-interested-location',
  auth('Common'),
  MapsController.addInterestedLocation
);

export const MapsRoutes = router;
