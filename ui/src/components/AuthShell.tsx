import type { ReactNode } from "react";
import { Logo } from "./Logo.tsx";

const highlights = [
  "Record a voice note and the jobs are written for you.",
  "Each job goes to the right worker in your company.",
  "Everyone sees progress live as work moves along.",
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <Logo inverted />
        <div className="relative grid max-w-md gap-8">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Maintenance requests, from voice to done.
          </h2>
          <ul className="grid gap-4">
            {highlights.map((line) => (
              <li key={line} className="flex gap-3 text-sm text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">Workflow</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="grid w-full max-w-sm gap-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
          {footer ? <div className="text-center text-sm text-slate-500">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
