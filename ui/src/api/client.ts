import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

function isSessionRequest(url: string | undefined) {
  return url === "/auth/login" || url === "/auth/signup" || url === "/auth/refresh" || url === "/auth/logout";
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (error.response?.status !== 401 || !original || original._retry || isSessionRequest(original.url)) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshPromise ??= api.post("/auth/refresh").then(() => undefined).finally(() => {
      refreshPromise = null;
    });

    await refreshPromise;
    return api(original);
  },
);

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (typeof data?.error === "string") return data.error;
  }
  return fallback;
}
