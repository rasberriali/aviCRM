import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error('API Error Response:', {
      status: res.status,
      statusText: res.statusText,
      body: text,
      url: res.url
    });
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Use absolute URL in development to bypass Vite proxy issues
  const isDev = import.meta.env.DEV;
  const fullUrl = isDev && url.startsWith('/api/') 
    ? `http://localhost:5000${url}` 
    : url;

  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Use absolute URL in development to bypass Vite proxy issues
    const isDev = import.meta.env.DEV;
    const url = queryKey[0] as string;
    const fullUrl = isDev && url.startsWith('/api/') 
      ? `http://localhost:5000${url}` 
      : url;
    
    try {
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('Network error - server may be unavailable:', fullUrl);
        return null; // Return null instead of throwing for network errors
      }
      
      console.error('Query fetch error:', {
        url: fullUrl,
        error: error.message,
        stack: error.stack
      });
      
      // Return null instead of throwing to prevent unhandled rejections
      return null;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes
      retry: false, // Disable retries to prevent cascading errors
    },
    mutations: {
      retry: false,
    },
  },
});

// Add global error handlers to catch unhandled rejections
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'error') {
    console.warn('Query cache error:', event.error);
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event.type === 'error') {
    console.warn('Mutation cache error:', event.error);
  }
});

// Add global unhandled rejection handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent the default behavior
  });
}
