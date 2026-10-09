import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "../api/client.ts";
import { listJobs, type Job, type JobQuery } from "../api/jobs.ts";
import { useNotifications } from "../context/NotificationContext.tsx";

export function useJobs(query: JobQuery) {
  const { version } = useNotifications();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const queryKey = JSON.stringify(query);
  const requestKey = `${queryKey}|${version}|${reloadKey}`;

  useEffect(() => {
    let active = true;
    listJobs(JSON.parse(queryKey) as JobQuery)
      .then((next) => {
        if (!active) return;
        setJobs(next);
        setError("");
      })
      .catch((caught: unknown) => {
        if (active) setError(apiErrorMessage(caught, "Could not load jobs"));
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [queryKey, requestKey]);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  const replace = useCallback((job: Job) => {
    setJobs((current) => current.map((item) => (item.id === job.id ? job : item)));
  }, []);

  return { jobs, loading: loadedKey !== requestKey, error, reload, replace };
}
