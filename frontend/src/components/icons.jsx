/** One outline icon set: 16px, 1.5px stroke, currentColor. */
function Icon({ children }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <Icon>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.75 13.5c.4-2.4 2.1-3.75 4.25-3.75s3.85 1.35 4.25 3.75" />
      <path d="M10.5 3.2a2.5 2.5 0 0 1 0 4.6M12 9.9c1.2.45 2 1.65 2.25 3.6" />
    </Icon>
  );
}

export function BuildingIcon() {
  return (
    <Icon>
      <path d="M2 14h12M3.5 14V6.5L8 3l4.5 3.5V14" />
      <path d="M6.25 14v-3.25h3.5V14M6 8h.01M10 8h.01" />
    </Icon>
  );
}

export function BookIcon() {
  return (
    <Icon>
      <path d="M2.5 3.25c1.9-.6 3.75-.4 5.5.75v9c-1.75-1.15-3.6-1.35-5.5-.75z" />
      <path d="M13.5 3.25c-1.9-.6-3.75-.4-5.5.75v9c1.75-1.15 3.6-1.35 5.5-.75z" />
    </Icon>
  );
}

export function PersonIcon() {
  return (
    <Icon>
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M2.75 14c.5-2.75 2.6-4.25 5.25-4.25s4.75 1.5 5.25 4.25" />
    </Icon>
  );
}
