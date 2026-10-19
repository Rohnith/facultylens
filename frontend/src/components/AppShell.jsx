import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getHealth } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { Mark } from "./Mark";
import { ThemeSwitch } from "./ThemeSwitch";

/** Only screens that exist are listed; later phases add theirs here. */
const NAV = [{ to: "/", label: "System status", icon: PulseIcon, end: true }];

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

function NavItems({ onNavigate }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {NAV.map(({ to, label, icon: Icon, end }) => (
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
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function AppShell() {
  const health = useAsync(getHealth);
  const institution = health.data?.institution ?? (health.error ? "Institution unavailable" : null);
  const sheetRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const current = NAV.find((n) => n.to === location.pathname)?.label ?? "FacultyLens";

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
          <NavItems />
        </nav>
        <div className="mt-auto px-2.5">
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
            <NavItems onNavigate={() => setSheetOpen(false)} />
          </nav>
          <div className="mt-auto">
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
