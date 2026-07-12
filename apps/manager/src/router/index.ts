import { createRouter } from '@tanstack/react-router';
import { queryClient } from '@/lib/query-client';
import { rootRoute } from './routes/root.route';
import { indexRoute } from './routes/index.route';
import { authLayoutRoute } from './routes/auth/layout.route';
import { loginRoute } from './routes/auth/login.route';
import { registerRoute } from './routes/auth/register.route';
import { acceptInviteRoute } from './routes/auth/accept-invite.route';
import { sessionsRoute } from './routes/sessions.route';
import { employeesListRoute } from './routes/employees/list.route';
import { employeeDetailRoute } from './routes/employees/detail.route';
import { scheduleManagerRoute } from './routes/schedule/manager.route';
import { scheduleEmployeeRoute } from './routes/schedule/employee.route';
import { leaveManagerRoute } from './routes/leave/manager.route';
import { leaveEmployeeRoute } from './routes/leave/employee.route';
import { changeRequestsRoute } from './routes/change-requests.route';
import { myHistoryRoute } from './routes/my-history.route';
import { visitorsRoute } from './routes/visitors.route';
import { kioskDevicesRoute } from './routes/kiosk-devices.route';

const routeTree = rootRoute.addChildren([
  indexRoute,
  sessionsRoute,
  acceptInviteRoute,
  employeesListRoute,
  employeeDetailRoute,
  scheduleManagerRoute,
  scheduleEmployeeRoute,
  leaveManagerRoute,
  leaveEmployeeRoute,
  changeRequestsRoute,
  myHistoryRoute,
  visitorsRoute,
  kioskDevicesRoute,
  authLayoutRoute.addChildren([loginRoute, registerRoute]),
]);

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
