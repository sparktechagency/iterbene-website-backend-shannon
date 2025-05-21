import { Router } from 'express';
import { ConnectionsController } from './connections.controller';
import auth from '../../middlewares/auth';

const router = Router();

router.post('/add', auth('User'), ConnectionsController.addConnection);

router.get(
  '/check-sent-connection/:friendId',
  auth('User'),
  ConnectionsController.checkIsSentConnectionExists
);
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
  '/remove/:removedByUserId',
  auth('User'),
  ConnectionsController.removeConnection
);

router.delete(
  '/cancel/:friendId',
  auth('User'),
  ConnectionsController.cancelRequest
);

router.delete(
  '/delete/:connectionId',
  auth('User'),
  ConnectionsController.deleteConnection
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
