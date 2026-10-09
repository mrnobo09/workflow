import { useNotifications } from "../context/NotificationContext.tsx";

export function Toaster() {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-40 grid gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-96">
      {toasts.map((toast) => (
        <div
          key={toast.toastId}
          className="pointer-events-auto flex items-start gap-3 rounded-xl bg-slate-900 p-3.5 text-white shadow-xl ring-1 ring-black/5"
          role="status"
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
          <p className="flex-1 text-sm leading-snug">{toast.message}</p>
          <button
            type="button"
            className="-m-1 rounded p-1 text-slate-400 transition hover:text-white"
            onClick={() => dismissToast(toast.toastId)}
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
