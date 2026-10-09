import type { Account, AccountType } from "../api/auth.ts";
import type { JobStatus } from "../api/jobs.ts";

export const statusLabel: Record<JobStatus, string> = {
  draft: "Unassigned",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
};

export const roleLabel: Record<AccountType, string> = {
  user: "Requester",
  worker: "Worker",
  manager: "Manager",
};

export function roleHome(account: Account) {
  return `/${account.accountType}`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
