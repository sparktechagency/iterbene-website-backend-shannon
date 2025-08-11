import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ConnectionsController } from './connections.controller';

const router = Router();

router.post('/add', auth('Common'), ConnectionsController.addConnection);

router.get(
  '/check-sent-connection/:friendId',
  auth('Common'),
  ConnectionsController.checkIsSentConnectionExists
);
router.patch(
  '/accept/:connectionId',
  auth('Common'),
  ConnectionsController.acceptConnection
);

router.patch(
  '/decline/:connectionId',
  auth('Common'),
  ConnectionsController.declineConnection
);

router.delete(
  '/remove/:removedByUserId',
  auth('Common'),
  ConnectionsController.removeConnection
);

router.delete(
  '/cancel/:friendId',
  auth('Common'),
  ConnectionsController.cancelRequest
);

router.delete(
  '/delete/:deleteByUserId',
  auth('Common'),
  ConnectionsController.deleteConnection
);

router.get('/', auth('Common'), ConnectionsController.getMyAllConnections);

router.get(
  '/requests/received',
  auth('Common'),
  ConnectionsController.getMyAllRequests
);

router.get(
  '/requests/sent',
  auth('Common'),
  ConnectionsController.getSentMyRequests
);

router.get(
  '/mutual/:userId2',
  auth('Common'),
  ConnectionsController.getMutualConnections
);

router.get(
  '/suggestions',
  auth('Common'),
  ConnectionsController.getConnectionSuggestions
);

export const ConnectionsRoutes = router;
