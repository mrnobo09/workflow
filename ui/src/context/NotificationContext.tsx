import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../api/client.ts";
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationStreamUrl,
  type Notice,
} from "../api/notifications.ts";

type Toast = Notice & { toastId: number };

type NotificationContextValue = {
  items: Notice[];
  unread: number;
  connected: boolean;
  /** Increments for each live notification so job lists know to reload. */
  version: number;
  toasts: Toast[];
  dismissToast: (toastId: number) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function newestId(current: string | undefined, candidate: string) {
  // ObjectIds sort by creation time when compared as hex strings.
  return !current || candidate > current ? candidate : current;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [connected, setConnected] = useState(false);
  const [version, setVersion] = useState(0);
  const lastIdRef = useRef<string | undefined>(undefined);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((toastId: number) => {
    setToasts((current) => current.filter((toast) => toast.toastId !== toastId));
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    function connect() {
      if (stopped) return;
      source = new EventSource(notificationStreamUrl(lastIdRef.current), { withCredentials: true });

      source.onopen = () => setConnected(true);

      source.addEventListener("backlog", (event) => {
        const backlog = JSON.parse((event as MessageEvent<string>).data) as Notice[];
        for (const item of backlog) lastIdRef.current = newestId(lastIdRef.current, item.id);
        setItems((current) => {
          const known = new Set(current.map((item) => item.id));
          return [...backlog.filter((item) => !known.has(item.id)), ...current];
        });
      });

      source.addEventListener("notification", (event) => {
        const notice = JSON.parse((event as MessageEvent<string>).data) as Notice;
        lastIdRef.current = newestId(lastIdRef.current, notice.id);
        setItems((current) => (
          current.some((item) => item.id === notice.id) ? current : [notice, ...current].slice(0, 50)
        ));
        const toastId = ++toastIdRef.current;
        setToasts((current) => (
          current.some((toast) => toast.id === notice.id)
            ? current
            : [...current.slice(-3), { ...notice, toastId }]
        ));
        setTimeout(() => dismissToast(toastId), 5_000);
        setVersion((value) => value + 1);
      });

      source.addEventListener("session-expired", () => {
        source?.close();
        reconnectWithRefresh(0);
      });

      source.onerror = () => {
        setConnected(false);
        // CONNECTING means the browser is retrying a dropped connection itself.
        // CLOSED means the server refused it, usually an expired access cookie.
        if (source?.readyState === EventSource.CLOSED) reconnectWithRefresh(2_000);
      };
    }

    function reconnectWithRefresh(delay: number) {
      setConnected(false);
      if (stopped) return;
      retry = setTimeout(() => {
        void api.post("/auth/refresh")
          .then(connect)
          .catch(() => reconnectWithRefresh(15_000));
      }, delay);
    }

    connect();

    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, [dismissToast]);

  const markRead = useCallback(async (id: string) => {
    setItems((current) => current.map((item) => (
      item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item
    )));
    await markNotificationRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    await markAllNotificationsRead();
  }, []);

  const unread = items.filter((item) => !item.readAt).length;

  return (
    <NotificationContext.Provider
      value={{ items, unread, connected, version, toasts, dismissToast, markRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return value;
}
