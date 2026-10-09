import { useEffect, useMemo, useState } from "react";
import { apiErrorMessage } from "../api/client.ts";
import {
  assignJob,
  changeJobStatus,
  listWorkers,
  type Job,
  type JobStatus,
  type Worker,
} from "../api/jobs.ts";
import type { Specialty } from "../api/specialties.ts";
import { JobCard, JobListState, Tabs } from "../components/JobCard.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { useNotifications } from "../context/NotificationContext.tsx";
import { useSpecialties } from "../context/SpecialtyContext.tsx";
import { useUser } from "../context/UserContext.tsx";
import { useJobs } from "../hooks/useJobs.ts";
import { statusLabel } from "../lib/format.ts";
import { card, input, secondaryButton } from "../lib/styles.ts";

type StatusFilter = "all" | JobStatus;

const nextAction: Partial<Record<JobStatus, { status: JobStatus; label: string }>> = {
  assigned: { status: "in_progress", label: "Mark started" },
  in_progress: { status: "completed", label: "Mark complete" },
};

function ManagerActions({
  job,
  workers,
  onChanged,
}: {
  job: Job;
  workers: Worker[];
  onChanged: (job: Job) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { label } = useSpecialties();
  const trade = label(job.specialty).toLowerCase();
  const candidates = workers.filter((worker) => worker.specialty === job.specialty);
  const canAssign = job.status === "draft" || job.status === "assigned";
  const action = nextAction[job.status];

  function run(task: () => Promise<Job>) {
    setPending(true);
    setError("");
    task()
      .then(onChanged)
      .catch((caught: unknown) => setError(apiErrorMessage(caught, "Could not update the job")))
      .finally(() => setPending(false));
  }

  return (
    <>
      {canAssign ? (
        candidates.length > 0 ? (
          <label className="flex w-full items-center gap-2 text-sm text-slate-600 sm:w-auto">
            <span className="shrink-0">{job.assignee ? "Reassign" : "Assign"}</span>
            <select
              className={`${input} min-w-0 flex-1 py-1.5 sm:w-52 sm:flex-none`}
              disabled={pending}
              value={job.assignee?.id ?? ""}
              onChange={(event) => {
                const workerId = event.target.value;
                if (workerId) run(() => assignJob(job.id, workerId));
              }}
            >
              <option value="">Choose a {trade}</option>
              {candidates.map((worker) => (
                <option key={worker.id} value={worker.id}>{worker.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <span className="text-sm text-amber-700">No {trade} in your company yet.</span>
        )
      ) : null}
      {action ? (
        <button
          type="button"
          className={secondaryButton}
          disabled={pending}
          onClick={() => run(() => changeJobStatus(job.id, action.status))}
        >
          {action.label}
        </button>
      ) : null}
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`${card} p-4 sm:p-5`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight sm:text-3xl ${tone}`}>{value}</p>
    </div>
  );
}

function LiveBadge() {
  const { connected } = useNotifications();
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      <span className="relative flex h-2 w-2">
        {connected ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /> : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`} />
      </span>
      {connected ? "Live updates" : "Reconnecting…"}
    </span>
  );
}

export function ManagerPage() {
  const { user } = useUser();
  const { specialties } = useSpecialties();
  const [specialty, setSpecialty] = useState<Specialty>("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const { jobs, loading, error, replace } = useJobs(specialty ? { specialty } : {});

  useEffect(() => {
    void listWorkers().then(setWorkers).catch(() => setWorkers([]));
  }, []);

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: jobs.length, draft: 0, assigned: 0, in_progress: 0, completed: 0 };
    for (const job of jobs) result[job.status] += 1;
    return result;
  }, [jobs]);

  const visible = status === "all" ? jobs : jobs.filter((job) => job.status === status);

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title="All jobs"
        subtitle={`Every job in ${user?.companyName ?? "your company"}. New work appears here as it comes in.`}
        actions={<LiveBadge />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Unassigned" value={counts.draft} tone="text-slate-900" />
        <Stat label="Assigned" value={counts.assigned} tone="text-sky-700" />
        <Stat label="In progress" value={counts.in_progress} tone="text-amber-700" />
        <Stat label="Completed" value={counts.completed} tone="text-emerald-700" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All", count: counts.all },
            ...(["draft", "assigned", "in_progress", "completed"] as const).map((value) => ({
              value,
              label: statusLabel[value],
              count: counts[value],
            })),
          ]}
        />
        <select
          className={`${input} w-full sm:w-48`}
          value={specialty}
          onChange={(event) => setSpecialty(event.target.value as Specialty | "")}
        >
          <option value="">All specialties</option>
          {specialties.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <JobListState
        loading={loading}
        error={error}
        empty={visible.length === 0}
        emptyText="No jobs match these filters."
      />
      <div className="grid gap-3">
        {visible.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            showCreator
            actions={job.status === "completed" ? undefined : (
              <ManagerActions job={job} workers={workers} onChanged={replace} />
            )}
          />
        ))}
      </div>
    </div>
  );
}
