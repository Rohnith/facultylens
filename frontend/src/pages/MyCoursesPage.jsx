import { useCallback } from "react";
import { api } from "../api/client";
import { FormError } from "../components/forms";
import { useAuth } from "../context/auth";
import { useAsync } from "../hooks/useAsync";

const COPY = {
  hod: {
    title: "Department courses",
    lead: "Every course offering in your department this year and before.",
    empty: "No course offerings in your department yet. The IQAC coordinator creates them.",
  },
  faculty: {
    title: "My courses",
    lead: "The course offerings you teach. Feedback for each appears here in a later release.",
    empty: "No courses assigned to you yet. Your IQAC coordinator assigns teachers to offerings.",
  },
  student: {
    title: "My courses",
    lead: "The course offerings you are enrolled in. Feedback forms open here when a cycle starts.",
    empty: "You aren't enrolled in any course yet. Ask your department office if this looks wrong.",
  },
};

async function loadCourses() {
  return (await api.get("/courses")).data;
}

export function MyCoursesPage() {
  const { user } = useAuth();
  const copy = COPY[user.role];
  const courses = useAsync(loadCourses);
  const retry = useCallback(() => courses.reload(), [courses]);

  return (
    <div className="mx-auto flex max-w-[1184px] flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 font-serif text-title font-semibold tracking-[-0.01em]">{copy.title}</h1>
        <p className="m-0 max-w-[72ch] text-body text-muted">{copy.lead}</p>
      </header>

      <section aria-label="Course offerings" className="card overflow-hidden">
        {courses.error ? (
          <div className="flex flex-wrap items-center gap-3 p-[var(--card-pad)]">
            <FormError>Couldn&apos;t load your courses.</FormError>
            <button type="button" className="btn btn-ghost h-8 px-2" onClick={retry}>
              Retry
            </button>
          </div>
        ) : courses.data && courses.data.length === 0 ? (
          <p className="m-0 p-[var(--card-pad)] text-body text-muted">{copy.empty}</p>
        ) : (
          <table className="w-full border-collapse text-body">
            <thead className="max-md:sr-only">
              <tr className="text-left text-small text-muted">
                <th scope="col" className="h-10 px-[var(--card-pad)] font-medium">
                  Course
                </th>
                <th scope="col" className="h-10 px-3 font-medium">
                  Year · semester · section
                </th>
                <th scope="col" className="h-10 px-3 font-medium">
                  Taught by
                </th>
                {user.role !== "student" && (
                  <th scope="col" className="h-10 px-[var(--card-pad)] text-right font-medium">
                    Students
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(courses.data ?? Array.from({ length: 3 }, () => null)).map((c, i) =>
                c ? (
                  <tr
                    key={c.id}
                    className="border-t border-rule max-md:flex max-md:flex-col max-md:gap-0.5 max-md:px-4 max-md:py-3"
                  >
                    <td className="h-[var(--row-height)] px-[var(--card-pad)] max-md:h-auto max-md:p-0">
                      <span className="font-medium">{c.code}</span>
                      <span className="text-muted"> · {c.name}</span>
                    </td>
                    <td className="num px-3 max-md:p-0 max-md:text-small max-md:text-muted">
                      {c.academic_year} · Sem {c.semester} · {c.section}
                    </td>
                    <td className="px-3 max-md:p-0 max-md:text-small max-md:text-muted">
                      {c.faculty.length ? (
                        c.faculty.map((f) => f.name).join(", ")
                      ) : (
                        <span className="text-faint">Not assigned</span>
                      )}
                    </td>
                    {user.role !== "student" && (
                      <td className="num px-[var(--card-pad)] text-right max-md:p-0 max-md:text-left max-md:text-small max-md:text-muted">
                        {c.student_count}
                        <span className="md:hidden"> students</span>
                      </td>
                    )}
                  </tr>
                ) : (
                  <tr key={i} className="border-t border-rule">
                    <td colSpan={4} className="h-[var(--row-height)] px-[var(--card-pad)]">
                      <span className="skeleton h-4 w-full max-w-[520px]" />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
