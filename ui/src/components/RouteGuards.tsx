import type { ReactNode } from "react";
import { Navigate } from "react-router";
import type { AccountType } from "../api/auth.ts";
import { useUser } from "../context/UserContext.tsx";
import { roleHome } from "../lib/format.ts";

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Checking your session…
    </div>
  );
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function RequireRole({ roles, children }: { roles: AccountType[]; children: ReactNode }) {
  const { user, loading } = useUser();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.accountType)) return <Navigate to={roleHome(user)} replace />;
  return children;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={roleHome(user)} replace />;
  return children;
}

export function HomeRedirect() {
  const { user, loading } = useUser();
  if (loading) return <FullPageSpinner />;
  return <Navigate to={user ? roleHome(user) : "/login"} replace />;
}
