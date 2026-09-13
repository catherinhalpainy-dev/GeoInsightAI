import "./App.css";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { NotFoundPage } from "./pages/NotFoundPage";

const DataImportPage = lazy(() =>
  import("./pages/DataImportPage").then((module) => ({
    default: module.DataImportPage,
  })),
);

const WorkspacePage = lazy(() =>
  import("./pages/WorkspacePage").then((module) => ({
    default: module.WorkspacePage,
  })),
);

const StatisticsPage = lazy(() =>
  import("./pages/StatisticsPage").then((module) => ({
    default: module.StatisticsPage,
  })),
);

const ReportPage = lazy(() =>
  import("./pages/ReportPage").then((module) => ({
    default: module.ReportPage,
  })),
);

function RouteLoadingFallback() {
  return (
    <main className="page-content" aria-live="polite" aria-busy="true">
      <p>正在加载页面…</p>
    </main>
  );
}


function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* 所有内部页面都使用 AppShell */}
        <Route element={<AppShell />}>
          <Route
            index
            element={<Navigate to="import" replace />}
          />
          <Route
            path="/import"
            element={<DataImportPage />}
          />
          <Route
            path="/workspace"
            element={<WorkspacePage />}
          />
          <Route
            path="/statistics"
            element={<StatisticsPage />}
          />

          <Route
            path="/report"
            element={<ReportPage />}
          />
          <Route
            path="*"
            element={<NotFoundPage/>}
          />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
