import { api } from "./client.ts";
import type { Specialty } from "./specialties.ts";

export const JOB_STATUSES = ["draft", "assigned", "in_progress", "completed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type Job = {
  id: string;
  description: string;
  location?: string;
  specialty: Specialty;
  status: JobStatus;
  requestedTimeText?: string;
  sourceText?: string;
  assignee: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export type JobQuery = {
  scope?: "mine";
  status?: JobStatus;
  specialty?: Specialty;
};

export type Worker = {
  id: string;
  name: string;
  specialty?: Specialty;
};

export async function listJobs(query: JobQuery = {}) {
  const { data } = await api.get<{ jobs: Job[] }>("/jobs", { params: query });
  return data.jobs;
}

export async function changeJobStatus(id: string, status: JobStatus) {
  const { data } = await api.patch<{ job: Job }>(`/jobs/${id}/status`, { status });
  return data.job;
}

export async function assignJob(id: string, workerId: string) {
  const { data } = await api.patch<{ job: Job }>(`/jobs/${id}/assignee`, { workerId });
  return data.job;
}

export async function listWorkers() {
  const { data } = await api.get<{ workers: Worker[] }>("/workers");
  return data.workers;
}
