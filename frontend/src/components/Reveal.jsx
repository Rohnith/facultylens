import { useEffect, useRef, useState } from "react";

/**
 * Holds the notes inside it until the group scrolls into view, then lets them settle (once).
 * Groups already on screen settle straight away; without IntersectionObserver they never wait.
 * `ready` holds off watching until the content is in, so a loading placeholder that happens to
 * be on screen does not count as "seen".
 */
export function Reveal({ as: Tag = "div", ready = true, className = "", children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const node = ref.current;
    if (seen || !ready || !node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen, ready]);

  return (
    <Tag ref={ref} data-reveal="" className={`${className} ${seen ? "in-view" : ""}`} {...rest}>
      {children}
    </Tag>
  );
}
