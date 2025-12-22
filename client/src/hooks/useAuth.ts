import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export type PublicUser = {
  id: string;
  username: string;
  name: string;
  role: string;
  schoolId: string;
  schoolName: string | null;
};

export type DashboardPage = {
  id: string;
  title: string;
  path: string;
};

export type DashboardBootstrap = {
  path: string;
  role: "admin" | "teacher";
  pages: DashboardPage[];
  permissions: {
    canManageUsers: boolean;
    canExport: boolean;
  };
};

export type AuthMeResponse = {
  ok: true;
  user: PublicUser;
  dashboard: DashboardBootstrap;
};

export function useAuth() {
  const query = useQuery<AuthMeResponse | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn<AuthMeResponse | null>({ on401: "returnNull" }),
    staleTime: 30_000,
  });

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    auth: query.data,
    user: query.data?.user ?? null,
    dashboard: query.data?.dashboard ?? null,
    refetch: query.refetch,
  };
}

