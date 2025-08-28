import { Router } from 'express';
import { MapsController } from './maps.controllers';
import { fullAuth } from '../../middlewares/smartAuth';

const router = Router();

router.get('/my-maps', fullAuth('Common'), MapsController.myMaps);
router.post(
  '/add-interested-location',
  fullAuth('Common'),
  MapsController.addInterestedLocation
);

export const MapsRoutes = router;
