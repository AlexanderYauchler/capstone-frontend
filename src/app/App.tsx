import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders } from './providers/AppProviders';
import { appRoutes } from './router/routes';

const browserRouter = createBrowserRouter(appRoutes);

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={browserRouter} />
    </AppProviders>
  );
}
