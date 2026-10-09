import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../context/NotificationContext.tsx";
import { timeAgo } from "../lib/format.ts";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

export function NotificationBell() {
  const { items, unread, connected, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label={`Notifications, ${unread} unread`}
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-3 top-[4.5rem] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              <span
                className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`}
                title={connected ? "Live" : "Reconnecting"}
              />
            </div>
            {unread > 0 ? (
              <button type="button" className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => void markAllRead()}>
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-[70dvh] overflow-y-auto sm:max-h-96">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</li>
            ) : null}
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void markRead(item.id)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${item.readAt ? "" : "bg-indigo-50/50"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-indigo-500"}`} />
                  <span className="grid gap-0.5">
                    <span className="text-sm text-slate-800">{item.message}</span>
                    <span className="text-xs text-slate-500">{timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
