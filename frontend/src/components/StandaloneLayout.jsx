import { useAsync } from "../hooks/useAsync";
import { getHealth } from "../api/client";
import { Mark } from "./Mark";
import { ThemeSwitch } from "./ThemeSwitch";

/**
 * Signed-out screens: product and institution at the top, the form on the left of a two-column
 * grid and, when given, an aside on the right (stacked below the form on small screens).
 */
export function StandaloneLayout({ children, aside }) {
  const health = useAsync(getHealth);
  const institution = health.data?.institution;
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="mx-auto flex w-full max-w-[1184px] items-center gap-2.5 px-4 pt-5 md:px-[var(--pad)] md:pt-8">
        <Mark size={28} />
        <div className="leading-tight">
          <div className="text-section font-semibold tracking-[-0.01em]">FacultyLens</div>
          <div className="min-h-4 text-small text-muted">{institution ?? ""}</div>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto grid w-full max-w-[1184px] flex-1 content-start gap-12 px-4 pt-12 pb-16 md:px-[var(--pad)] md:pt-20 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-24"
      >
        <div className="w-full max-w-[400px]">{children}</div>
        {aside && <aside className="max-w-[560px] lg:pt-1">{aside}</aside>}
      </main>
      <footer className="mx-auto w-full max-w-[1184px] px-4 pb-6 md:px-[var(--pad)]">
        <div className="w-60">
          <ThemeSwitch />
        </div>
      </footer>
    </div>
  );
}
