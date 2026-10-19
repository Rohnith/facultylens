/** FacultyLens mark: a lens over three feedback bars. Ink tile, the one data hue on the bars. */
export function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" fill="var(--primary)" />
      <circle cx="14" cy="14" r="8" fill="none" stroke="var(--primary-ink)" strokeWidth="2.4" />
      <path
        d="M20 20 25.5 25.5"
        stroke="var(--primary-ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <rect x="9.6" y="13.5" width="2.2" height="4" rx="0.6" fill="var(--chart-main)" />
      <rect x="12.9" y="10.5" width="2.2" height="7" rx="0.6" fill="var(--chart-main)" />
      <rect x="16.2" y="12" width="2.2" height="5.5" rx="0.6" fill="var(--chart-main)" />
    </svg>
  );
}
