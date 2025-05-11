import { Router } from 'express';
import { ConnectionsController } from './connections.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { ConnectionValidation } from './connections.validations';

const router = Router();

router.post('/add', auth('User'), ConnectionsController.addConnection);

router.patch(
  '/accept/:connectionId',
  auth('User'),
  ConnectionsController.acceptConnection
);

router.patch(
  '/decline/:connectionId',
  auth('User'),
  ConnectionsController.declineConnection
);

router.delete(
  '/remove/:connectionId',
  auth('User'),
  ConnectionsController.removeConnection
);

router.delete(
  '/cancel/:connectionId',
  auth('User'),
  ConnectionsController.cancelRequest
);

router.get('/', auth('User'), ConnectionsController.getMyAllConnections);

router.get(
  '/requests/received',
  auth('User'),
  ConnectionsController.getMyAllRequests
);

router.get(
  '/requests/sent',
  auth('User'),
  ConnectionsController.getSentMyRequests
);

router.post('/block', auth('User'), ConnectionsController.blockUser);

router.post('/unblock', auth('User'), ConnectionsController.unblockUser);

router.get(
  '/mutual/:userId2',
  auth('User'),
  ConnectionsController.getMutualConnections
);

router.get(
  '/status/:userId2',
  auth('User'),
  ConnectionsController.checkConnectionStatus
);

router.get(
  '/suggestions',
  auth('User'),
  ConnectionsController.getConnectionSuggestions
);

export const ConnectionsRoutes = router;
