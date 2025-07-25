import { useQuery } from "@tanstack/react-query";

export function useCustomAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/custom-user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}