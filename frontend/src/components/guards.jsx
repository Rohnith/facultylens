import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/auth";

function SessionCheck() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ground" role="status" aria-live="polite">
      <span className="text-body text-muted">Checking your session…</span>
    </div>
  );
}

/** Signed-in users only; a temporary password must be changed before anything else. */
export function RequireAuth() {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === "loading") return <SessionCheck />;
  if (status === "signedOut") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.must_change_pw) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

/** Renders the child routes for the listed roles, otherwise a plain "not allowed" page. */
export function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) {
    return (
      <div className="mx-auto flex max-w-[1184px] flex-col gap-2">
        <h1 className="m-0 font-serif text-title font-semibold">Not available for your account</h1>
        <p className="m-0 max-w-[60ch] text-muted">
          This page is for other roles. If you think you should have access, ask your IQAC
          coordinator.
        </p>
      </div>
    );
  }
  return <Outlet />;
}
