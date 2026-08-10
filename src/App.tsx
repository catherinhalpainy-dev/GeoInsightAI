import "./App.css";
import { Navigate, Route, Routes, } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DataImportPage } from "./pages/DataImportPage";
import { ReportPage } from "./pages/ReportPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { NotFoundPage } from "./pages/NotFoundPage";


function App() {
  return (
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
  );
}

export default App;