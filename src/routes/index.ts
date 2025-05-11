import express from 'express';
import { UserRoutes } from '../modules/user/user.route';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { SettingsRoutes } from '../modules/settings/settings.routes';
import { ContactRoutes } from '../modules/contact/contact.routes';
import { AdminRoutes } from '../modules/admin/admin.routes';
import { ChatRoutes } from '../modules/chat/chat.routes';
import { MessageRoutes } from '../modules/message/message.routes';
import { ReportRoutes } from '../modules/reports/reports.routes';
import { CountryRoutes } from '../modules/country/country.routes';
import { NotificationRoutes } from '../modules/notification/notification.routes';
import { GroupRoutes } from '../modules/group/group.routes';
import { ConnectionsRoutes } from '../modules/connections/connections.routes';
import { BlockedUserRoutes } from '../modules/blockedUsers/blockedUsers.route';
import { FollowerRoutes } from '../modules/followers/followers.route';
import { EventRoutes } from '../modules/event/event.routes';
import { StoryRoutes } from '../modules/story/story.route';
const router = express.Router();

const apiRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/blocked-users',
    route: BlockedUserRoutes,
  },
  {
    path: '/followers',
    route: FollowerRoutes,
  },
  {
    path: '/connections',
    route: ConnectionsRoutes,
  },
  {
    path: '/groups',
    route: GroupRoutes,
  },
  {
    path: '/events',
    route: EventRoutes,
  },
  {
    path: '/stories',
    route: StoryRoutes,
  },
  {
    path: '/chats',
    route: ChatRoutes,
  },
  {
    path: '/messages',
    route: MessageRoutes,
  },
  {
    path: '/reports',
    route: ReportRoutes,
  },
  {
    path: '/countries',
    route: CountryRoutes,
  },
  {
    path: '/settings',
    route: SettingsRoutes,
  },
  {
    path: '/contacts',
    route: ContactRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
