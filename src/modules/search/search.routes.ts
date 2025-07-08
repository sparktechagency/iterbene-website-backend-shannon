import { Router } from 'express';
import { SearchController } from './search.controlller';

const router = Router();

// Search for locations and posts
router.get('/location-post', SearchController.searchLocationPost);

// Search for users and hashtags
router.get('/users-hashtags', SearchController.searchUsersHashtags);

// Get visited places for a location
router.get(
  '/location-visited-places',
  SearchController.getLocationVisitedPlaces
);

export const SearchRoutes = router;
