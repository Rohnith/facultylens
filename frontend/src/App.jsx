import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "./components/AppShell";
import { RequireAuth, RequireRole } from "./components/guards";
import { useAuth } from "./context/auth";
import { CourseDetailPage } from "./pages/admin/CourseDetailPage";
import { CoursesPage } from "./pages/admin/CoursesPage";
import { DepartmentsPage } from "./pages/admin/DepartmentsPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { MyCoursesPage } from "./pages/MyCoursesPage";
import { StatusPage } from "./pages/StatusPage";

function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1184px] flex-col gap-2">
      <h1 className="m-0 font-serif text-title font-semibold">Page not found</h1>
      <p className="m-0 text-muted">This address doesn&apos;t match any FacultyLens screen.</p>
    </div>
  );
}

/** Each role lands on its own first screen. */
function Home() {
  const { user } = useAuth();
  return user.role === "admin" ? <Navigate to="/admin/users" replace /> : <MyCoursesPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="admin" element={<RequireRole roles={["admin"]} />}>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:courseId" element={<CourseDetailPage />} />
            <Route path="status" element={<StatusPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
