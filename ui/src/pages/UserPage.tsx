import { useMemo, useState } from "react";
import type { JobStatus } from "../api/jobs.ts";
import { AudioRecorder } from "../components/AudioRecorder.tsx";
import { JobCard, JobListState, Tabs } from "../components/JobCard.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { useUser } from "../context/UserContext.tsx";
import { useJobs } from "../hooks/useJobs.ts";

type Filter = "all" | JobStatus;

export function UserPage() {
  const { user } = useUser();
  const { jobs, loading, error, reload } = useJobs({});
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: jobs.length, draft: 0, assigned: 0, in_progress: 0, completed: 0 };
    for (const job of jobs) result[job.status] += 1;
    return result;
  }, [jobs]);

  const visible = filter === "all" ? jobs : jobs.filter((job) => job.status === filter);

  return (
    <div className="grid grid-cols-1 gap-8">
      <PageHeader
        title={`Hi ${user?.name.split(" ")[0] ?? ""}`}
        subtitle="Record a maintenance request and follow it until it's done."
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24">
          <AudioRecorder onSaved={reload} />
        </div>

        <section className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Your requests</h2>
            <Tabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "draft", label: "Unassigned", count: counts.draft },
                { value: "assigned", label: "Assigned", count: counts.assigned },
                { value: "in_progress", label: "In progress", count: counts.in_progress },
                { value: "completed", label: "Done", count: counts.completed },
              ]}
            />
          </div>
          <JobListState
            loading={loading}
            error={error}
            empty={visible.length === 0}
            emptyText={jobs.length === 0 ? "No requests yet. Record a voice note to create one." : "Nothing in this view."}
          />
          <div className="grid gap-3">
            {visible.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
