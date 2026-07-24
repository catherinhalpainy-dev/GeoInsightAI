import { Outlet } from "react-router-dom";
import { StatusBar } from "./StatusBar";
import { TopBar } from "./TopBar";
import "../../styles/layout.css";

export function AppShell() {
    return (
        <div className="app-shell">
            <TopBar />
            <main className="app-main">
                {/* 插槽: 访问 /import
→ Outlet 显示 DataImportPage

访问 /workspace
→ Outlet 显示 WorkspacePage*/}
                <Outlet />
            </main>
            <StatusBar statusText="就绪" />
        </div>
    );
}