import { useRouteError } from "react-router";
import { Button } from "../../design-system/components/Button";

export function RouteErrorPage() {
  useRouteError();
  const homeUrl = import.meta.env.BASE_URL;
  return (
    <main className="mx-auto max-w-xl p-8 space-y-4" role="alert">
      <h1 className="text-2xl">This page could not be opened</h1>
      <p>Your last saved work is preserved. Reload the page to try again.</p>
      <Button onClick={() => window.location.reload()}>Reload page</Button>
      <a className="block underline" href={homeUrl}>
        Return to role selection
      </a>
    </main>
  );
}
