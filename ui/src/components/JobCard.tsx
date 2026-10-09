import type { ReactNode } from "react";
import type { Job, JobStatus } from "../api/jobs.ts";
import { useSpecialties } from "../context/SpecialtyContext.tsx";
import { statusLabel, timeAgo } from "../lib/format.ts";
import { card } from "../lib/styles.ts";

const statusStyle: Record<JobStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  assigned: "bg-sky-50 text-sky-700 ring-sky-200",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyle[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="truncate text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export function JobCard({
  job,
  showCreator = false,
  showAssignee = true,
  actions,
}: {
  job: Job;
  showCreator?: boolean;
  showAssignee?: boolean;
  actions?: ReactNode;
}) {
  const { label } = useSpecialties();
  return (
    <article className={`${card} grid gap-4 p-4 transition hover:shadow-md sm:p-5`}>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {label(job.specialty)}
            </span>
          </div>
          <span className="shrink-0 text-xs text-slate-400">{timeAgo(job.createdAt)}</span>
        </div>
        <h3 className="text-[15px] font-semibold leading-snug text-slate-900 sm:text-base">{job.description}</h3>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Meta label="Location" value={job.location} />
        <Meta label="Requested time" value={job.requestedTimeText} />
        {showAssignee ? <Meta label="Assigned to" value={job.assignee?.name ?? "Nobody yet"} /> : null}
        {showCreator ? <Meta label="Reported by" value={job.createdBy.name} /> : null}
      </dl>

      {job.sourceText ? (
        <blockquote className="border-l-2 border-slate-200 pl-3 text-sm italic text-slate-500">
          “{job.sourceText}”
        </blockquote>
      ) : null}

      {actions ? (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

export function JobListState({
  loading,
  error,
  empty,
  emptyText,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  emptyText: string;
}) {
  if (error) {
    return <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  }
  if (loading && empty) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className={`${card} h-32 animate-pulse bg-slate-100/60`} />
        ))}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }
  return null;
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; count?: number }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
    <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-600"}`}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
    </div>
  );
}
