import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { StatusPage } from "./pages/StatusPage";

function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1184px] flex-col gap-2">
      <h1 className="m-0 font-serif text-title font-semibold">Page not found</h1>
      <p className="m-0 text-muted">This address doesn&apos;t match any FacultyLens screen.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<StatusPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
