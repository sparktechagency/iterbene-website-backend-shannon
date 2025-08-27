import { Router } from 'express';
import { CountryController } from './country.controller';
import { cacheFor } from '../../middlewares/cacheMiddleware';

const router = Router();

router.get('/', CountryController.getAllCountries);
router.get('/:country/states', CountryController.getStatesByCountry);
router.get(
  '/:country/states/:state/cities',

  CountryController.getCitiesByState
);

export const CountryRoutes = router;
