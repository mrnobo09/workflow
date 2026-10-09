import { api } from "./client.ts";

export type Notice = {
  id: string;
  type: string;
  message: string;
  jobId?: string;
  createdAt: string;
  readAt: string | null;
};

export function notificationStreamUrl(lastEventId?: string) {
  const url = new URL("/sse/notifications", api.defaults.baseURL);
  if (lastEventId) url.searchParams.set("lastEventId", lastEventId);
  return url.toString();
}

export async function markNotificationRead(id: string) {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.post("/notifications/read-all");
}
