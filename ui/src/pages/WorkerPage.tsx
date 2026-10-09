import { useState } from "react";
import { apiErrorMessage } from "../api/client.ts";
import { changeJobStatus, type Job, type JobStatus } from "../api/jobs.ts";
import { JobCard, JobListState, Tabs } from "../components/JobCard.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { useSpecialties } from "../context/SpecialtyContext.tsx";
import { useUser } from "../context/UserContext.tsx";
import { useJobs } from "../hooks/useJobs.ts";
import { primaryButton } from "../lib/styles.ts";

type View = "mine" | "team";

const nextAction: Partial<Record<JobStatus, { status: JobStatus; label: string }>> = {
  assigned: { status: "in_progress", label: "Start job" },
  in_progress: { status: "completed", label: "Mark complete" },
};

function WorkerActions({ job, onChanged }: { job: Job; onChanged: (job: Job) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const action = nextAction[job.status];
  if (!action) return null;

  return (
    <>
      <button
        type="button"
        className={`${primaryButton} w-full sm:w-auto`}
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError("");
          changeJobStatus(job.id, action.status)
            .then(onChanged)
            .catch((caught: unknown) => setError(apiErrorMessage(caught, "Could not update the job")))
            .finally(() => setPending(false));
        }}
      >
        {pending ? "Saving…" : action.label}
      </button>
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </>
  );
}

export function WorkerPage() {
  const { user } = useUser();
  const [view, setView] = useState<View>("mine");
  const { jobs, loading, error, replace } = useJobs(view === "mine" ? { scope: "mine" } : {});
  const { label } = useSpecialties();
  const specialty = user?.specialty ? label(user.specialty) : "Team";
  const trade = specialty.toLowerCase();

  const open = jobs.filter((job) => job.status !== "completed");
  const done = jobs.filter((job) => job.status === "completed");

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={`${specialty} jobs`}
        subtitle={view === "mine"
          ? "Work assigned to you. Start a job when you arrive and complete it when you're done."
          : `Every ${trade} job in ${user?.companyName ?? "your company"}.`}
      />
      <div>
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: "mine", label: "Assigned to me" },
            { value: "team", label: `All ${trade} jobs` },
          ]}
        />
      </div>

      <JobListState
        loading={loading}
        error={error}
        empty={jobs.length === 0}
        emptyText={view === "mine" ? "Nothing assigned to you right now." : "No jobs for your specialty yet."}
      />

      {open.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Open · {open.length}</h2>
          {open.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              showCreator
              showAssignee={view === "team"}
              actions={view === "mine" ? <WorkerActions job={job} onChanged={replace} /> : undefined}
            />
          ))}
        </section>
      ) : null}

      {done.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Completed · {done.length}</h2>
          {done.map((job) => (
            <JobCard key={job.id} job={job} showCreator showAssignee={view === "team"} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
