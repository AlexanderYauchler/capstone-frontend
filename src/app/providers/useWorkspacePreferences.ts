import { useQuery } from "@tanstack/react-query";
import { useServices } from "./ServiceProvider";

export function useWorkspacePreferences(enabled = true) {
  const services = useServices();
  return useQuery({
    queryKey: ["workspace-preferences"],
    queryFn: () => services.admin.getPreferences(),
    enabled,
  });
}
