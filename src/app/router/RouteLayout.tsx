import { useEffect } from "react";
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from "react-router";

export function RouteLayout() {
  const { pathname } = useLocation();
  const navigation = useNavigation();

  useEffect(() => {
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      {navigation.state !== "idle" && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-50 bg-white p-2 text-center text-sm"
        >
          Opening page…
        </div>
      )}
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
