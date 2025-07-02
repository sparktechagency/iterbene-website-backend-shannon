import { Router } from 'express';
import { SearchController } from './search.controlller';

const router = Router();

// searchLocationPost
router.get('/location-post', SearchController.searchLocationPost);

//searchUsersHashtags
router.get('/users-hashtags', SearchController.searchUsersHashtags);

export const SearchRoutes = router;
