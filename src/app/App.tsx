import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders } from './providers/AppProviders';
import { appRoutes } from './router/routes';

const routerBasename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';

const browserRouter = createBrowserRouter(appRoutes, { basename: routerBasename });

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={browserRouter} />
    </AppProviders>
  );
}
