import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { MODERATION_CHANGED, analysisApi } from "../api/analysis";
import { getHealth } from "../api/client";
import { ROLE_LABELS, useAuth } from "../context/auth";
import { useAsync } from "../hooks/useAsync";
import {
  BookIcon,
  BuildingIcon,
  CalendarIcon,
  ClipboardIcon,
  PeopleIcon,
  LensIcon,
  PersonIcon,
  ShieldIcon,
  SparkIcon,
} from "./icons";
import { Mark } from "./Mark";
import { ThemeSwitch } from "./ThemeSwitch";

/** Navigation per role. Only screens that exist are listed; later phases add theirs here. */
const NAV_BY_ROLE = {
  admin: [
    { to: "/admin/users", label: "Users", icon: PeopleIcon },
    { to: "/admin/departments", label: "Departments", icon: BuildingIcon },
    { to: "/admin/courses", label: "Courses", icon: BookIcon },
    { to: "/admin/cycles", label: "Feedback cycles", icon: CalendarIcon },
    { to: "/admin/analysis", label: "Analysis", icon: SparkIcon },
    { to: "/admin/moderation", label: "Moderation", icon: ShieldIcon, badge: "moderation" },
    { to: "/admin/status", label: "System status", icon: PulseIcon },
  ],
  hod: [
    { to: "/", label: "Department courses", icon: BookIcon, end: true },
    { to: "/me", label: "My page", icon: LensIcon },
    { to: "/profile", label: "My profile", icon: PersonIcon },
  ],
  faculty: [
    { to: "/", label: "My courses", icon: BookIcon, end: true },
    { to: "/me", label: "My page", icon: LensIcon },
    { to: "/profile", label: "My profile", icon: PersonIcon },
  ],
  student: [
    { to: "/", label: "Feedback forms", icon: ClipboardIcon, end: true },
    { to: "/courses", label: "My courses", icon: BookIcon },
  ],
};

function PulseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 8.5h3l1.75-4 3.5 8 1.75-4h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Brand({ institution }) {
  return (
    <div className="flex items-center gap-2.5">
      <Mark size={28} />
      <div className="min-w-0 leading-tight">
        <div className="text-section font-semibold tracking-[-0.01em]">FacultyLens</div>
        <div className="truncate text-small text-muted" title={institution ?? undefined}>
          {institution ?? <span className="skeleton h-3 w-28 align-middle" />}
        </div>
      </div>
    </div>
  );
}

/** Pending moderation items for the admin nav; refreshed after each decision and every minute. */
function usePendingModeration(enabled) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const load = () =>
      analysisApi
        .queue({ status: "pending", limit: 1 })
        .then((q) => alive && setCount(q.pending))
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener(MODERATION_CHANGED, load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener(MODERATION_CHANGED, load);
    };
  }, [enabled]);
  return count;
}

function NavItems({ items, onNavigate, badges = {} }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {items.map(({ to, label, icon: Icon, end, badge }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex h-[var(--nav-row)] items-center gap-2.5 rounded-control px-2.5 text-body no-underline transition-colors duration-150 ${
                isActive ? "bg-active text-text" : "text-muted hover:bg-active hover:text-text"
              }`
            }
          >
            <Icon />
            {label}
            {badge && badges[badge] > 0 && (
              <span className="num ml-auto rounded-chip bg-surface px-1.5 text-small font-medium text-text">
                {badges[badge]}
                <span className="sr-only"> pending</span>
              </span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function Account({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function signOut() {
    await logout();
    // A fresh sign-in page: never send the next person to the previous user's page.
    navigate("/login", { replace: true, state: null });
  }
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="min-w-0 leading-tight">
        <div className="truncate text-body font-medium" title={user.name}>
          {user.name}
        </div>
        <div className="truncate text-small text-muted">
          {ROLE_LABELS[user.role]}
          {user.roll_no ? ` · ${user.roll_no}` : ""}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-small">
        <Link
          to="/change-password"
          onClick={onNavigate}
          className="text-muted underline underline-offset-3 hover:text-text"
        >
          Change password
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="cursor-pointer text-muted underline underline-offset-3 hover:text-text"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const nav = NAV_BY_ROLE[user.role] ?? [];
  const health = useAsync(getHealth);
  const badges = { moderation: usePendingModeration(user.role === "admin") };
  const institution = health.data?.institution ?? (health.error ? "Institution unavailable" : null);
  const sheetRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const current =
    nav.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
      ?.label ?? "FacultyLens";

  useEffect(() => {
    const dlg = sheetRef.current;
    if (!dlg) return;
    if (sheetOpen && !dlg.open) dlg.showModal();
    if (!sheetOpen && dlg.open) dlg.close();
  }, [sheetOpen]);

  return (
    <div className="min-h-dvh bg-ground lg:grid lg:grid-cols-[var(--sidebar-width)_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-body"
      >
        Skip to content
      </a>

      {/* Desktop sidebar: on the page ground, one hairline to the canvas. */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border px-3 pt-5 pb-4 lg:flex">
        <div className="px-2.5 pb-6">
          <Brand institution={institution} />
        </div>
        <nav aria-label="Main">
          <NavItems items={nav} badges={badges} />
        </nav>
        <div className="mt-auto flex flex-col gap-4 px-2.5">
          <Account />
          <ThemeSwitch />
        </div>
      </aside>

      {/* Phone and tablet: 48px top bar; the nav opens as a full-screen sheet. */}
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-ground px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <Mark size={24} />
          <span className="text-body font-medium">{current}</span>
        </div>
        <button
          type="button"
          className="btn btn-ghost h-11 w-11 px-0"
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M2.5 5h13M2.5 9h13M2.5 13h13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <dialog
        ref={sheetRef}
        aria-label="Menu"
        onClose={() => setSheetOpen(false)}
        className="sheet m-0 h-dvh max-h-none w-full max-w-none border-0 bg-ground p-0 text-text backdrop:bg-black/30"
      >
        <div className="flex h-full flex-col px-4 pt-3 pb-6">
          <div className="flex h-12 items-center justify-between">
            <Brand institution={institution} />
            <button
              type="button"
              className="btn btn-ghost h-11 w-11 px-0"
              aria-label="Close menu"
              onClick={() => setSheetOpen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M4 4l10 10M14 4 4 14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <nav aria-label="Main" className="mt-6">
            <NavItems items={nav} badges={badges} onNavigate={() => setSheetOpen(false)} />
          </nav>
          <div className="mt-auto flex flex-col gap-4">
            <Account onNavigate={() => setSheetOpen(false)} />
            <ThemeSwitch />
          </div>
        </div>
      </dialog>

      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 px-4 pt-6 pb-16 outline-none md:px-[var(--pad)] md:pt-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
