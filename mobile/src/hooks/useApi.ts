import { useState, useCallback } from "react";
import { api } from "../api/client";
import type { AxiosRequestConfig } from "axios";

type Method = "get" | "post" | "put" | "patch" | "delete";

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  execute: (config?: AxiosRequestConfig) => Promise<T | null>;
}

/**
 * Generic hook for API calls with loading/error state management.
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error, execute } = useApi<IPost[]>("get", "/post/feed");
 * useEffect(() => { execute(); }, [execute]);
 * ```
 */
export function useApi<T = unknown>(
  method: Method,
  url: string,
  body?: unknown,
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (config?: AxiosRequestConfig): Promise<T | null> => {
      try {
        setLoading(true);
        setError(null);

        const response =
          method === "get" || method === "delete"
            ? await api[method](url, config)
            : await api[method](url, body, config);

        const result = response.data?.data ?? response.data;
        setData(result);
        return result;
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || "Đã xảy ra lỗi";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [method, url, body],
  );

  return { data, error, loading, execute };
}
