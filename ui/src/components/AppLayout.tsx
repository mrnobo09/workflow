import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { useSpecialties } from "../context/SpecialtyContext.tsx";
import { useUser } from "../context/UserContext.tsx";
import { initials, roleLabel } from "../lib/format.ts";
import { Logo } from "./Logo.tsx";
import { NotificationBell } from "./NotificationBell.tsx";
import { Toaster } from "./Toaster.tsx";

const managerNav = [
  { to: "/manager", label: "Jobs", end: true },
  { to: "/manager/team", label: "Team", end: false },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  }`;
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  return `flex-1 border-b-2 py-2.5 text-center text-sm font-medium transition ${
    isActive ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-500"
  }`;
}

function AccountMenu() {
  const { user, logout } = useUser();
  const { label } = useSpecialties();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;
  const role = `${roleLabel[user.accountType]}${user.specialty ? ` · ${label(user.specialty)}` : ""}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-full p-0.5 transition hover:bg-slate-100 sm:rounded-lg sm:py-1 sm:pl-2 sm:pr-1"
        aria-label="Account"
      >
        <span className="hidden text-right leading-tight sm:block">
          <span className="block text-sm font-medium text-slate-900">{user.name}</span>
          <span className="block text-xs text-slate-500">{role}</span>
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
          {initials(user.name)}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <p className="mt-1 text-xs text-slate-500">{role} at {user.companyName}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppLayout() {
  const { user } = useUser();
  if (!user) return null;
  const isManager = user.accountType === "manager";

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <Logo compact />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-slate-900">{user.companyName || "Workflow"}</p>
                <p className="text-xs text-slate-500">Workflow</p>
              </div>
            </div>
            {isManager ? (
              <nav className="hidden items-center gap-1 sm:flex">
                {managerNav.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <NotificationBell />
            <AccountMenu />
          </div>
        </div>

        {isManager ? (
          <nav className="flex border-t border-slate-100 px-4 sm:hidden">
            {managerNav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={mobileNavClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
