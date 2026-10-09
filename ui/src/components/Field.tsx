import type { ReactNode } from "react";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{message}</p>;
}
