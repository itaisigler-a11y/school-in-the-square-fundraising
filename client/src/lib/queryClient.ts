import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Properly handle different data types - critical for file uploads
  let body: string | FormData | undefined;
  let headers: Record<string, string> = {};
  
  if (data) {
    if (data instanceof FormData) {
      // FormData handles its own content-type with boundary
      body = data;
      // Don't set Content-Type - let browser set multipart/form-data with boundary
    } else {
      // Regular JSON data
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body,
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
    // Extract URL and params from queryKey
    const [baseUrl, params] = queryKey;
    let url = baseUrl as string;
    
    // If there are query parameters, construct the URL properly
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const paramString = searchParams.toString();
      if (paramString) {
        url += '?' + paramString;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // Cache for 1 minute instead of infinity
      gcTime: 300000, // 5 minutes garbage collection time
      retry: 2, // Limit retries to prevent cascade failures
    },
    mutations: {
      retry: 1, // Single retry for mutations
      gcTime: 60000, // 1 minute garbage collection for mutations
    },
  },
});

// Intelligent cache management instead of global clearing
// Monitor cache growth but use targeted invalidation instead of wholesale clearing
let lastCacheCheck = Date.now();
setInterval(() => {
  const now = Date.now();
  if (now - lastCacheCheck > 300000) { // Every 5 minutes
    lastCacheCheck = now;
    const cacheSize = queryClient.getQueryCache().getAll().length;
    
    if (cacheSize > 200) { // Much higher threshold before intervention
      console.log(`📈 Large cache detected (${cacheSize} queries), using targeted cleanup`);
      
      // Target only old, stale queries instead of clearing everything
      const queries = queryClient.getQueryCache().getAll();
      const now = Date.now();
      let cleaned = 0;
      
      queries.forEach(query => {
        const lastUpdated = query.state.dataUpdatedAt;
        const age = now - lastUpdated;
        
        // Remove queries older than 10 minutes that haven't been accessed recently
        if (age > 600000 && !query.getObserversCount()) {
          queryClient.getQueryCache().remove(query);
          cleaned++;
        }
      });
      
      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} stale queries, cache now at ${cacheSize - cleaned} entries`);
      }
    }
  }
}, 60000); // Check every minute instead of every 5 minutes
