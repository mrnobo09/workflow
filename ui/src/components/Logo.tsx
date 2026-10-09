export function Logo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <div className="relative flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-indigo-700 shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-5 w-5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
      </div>
      {compact ? null : (
        <span className={`text-lg font-semibold tracking-tight ${inverted ? "text-white" : "text-slate-900"}`}>
          DocFlow
        </span>
      )}
    </div>
  );
}
