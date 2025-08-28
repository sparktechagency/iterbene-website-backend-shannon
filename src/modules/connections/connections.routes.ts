import { Router } from 'express';
import { ConnectionsController } from './connections.controller';
import { fullAuth } from '../../middlewares/smartAuth';

const router = Router();

router.post('/add', fullAuth('Common'), ConnectionsController.addConnection);

router.get(
  '/check-sent-connection/:friendId',
  fullAuth('Common'),
  ConnectionsController.checkIsSentConnectionExists
);
router.patch(
  '/accept/:connectionId',
  fullAuth('Common'),
  ConnectionsController.acceptConnection
);

router.patch(
  '/decline/:connectionId',
  fullAuth('Common'),
  ConnectionsController.declineConnection
);

router.delete(
  '/remove/:removedByUserId',
  fullAuth('Common'),
  ConnectionsController.removeConnection
);

router.delete(
  '/cancel/:friendId',
  fullAuth('Common'),
  ConnectionsController.cancelRequest
);

router.delete(
  '/delete/:deleteByUserId',
  fullAuth('Common'),
  ConnectionsController.deleteConnection
);

router.get('/', fullAuth('Common'), ConnectionsController.getMyAllConnections);

router.get(
  '/requests/received',
  fullAuth('Common'),
  ConnectionsController.getMyAllRequests
);

router.get(
  '/requests/sent',
  fullAuth('Common'),
  ConnectionsController.getSentMyRequests
);

router.get(
  '/mutual/:userId2',
  fullAuth('Common'),
  ConnectionsController.getMutualConnections
);

router.get(
  '/suggestions',
  fullAuth('Common'),
  ConnectionsController.getConnectionSuggestions
);

export const ConnectionsRoutes = router;
