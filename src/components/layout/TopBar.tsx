import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Cloud,
    CloudUpload,
    FolderOpen,
    Save,
} from "lucide-react";
import { useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAppContext } from "../../app/AppProvider";
import { useProjectContext } from "../../project/ProjectProvider";
import { deserializeProject } from "../../services/project/projectSerializer";
import type { GeoInsightProject } from "../../types/project";

const navigationItems = [
    { path: "/import", label: "数据导入" },
    { path: "/workspace", label: "地图工作台" },
    { path: "/statistics", label: "统计分析" },
    { path: "/report", label: "分析报告" },
];

const SAVE_STATUS_LABELS = {
    idle: "未建立工程",
    unsaved: "未保存",
    saving: "保存中...",
    saved: "已保存",
    error: "保存失败",
} as const;

export function TopBar() {
    const { state } = useAppContext();
    const {
        projectMeta,
        isDirty,
        saveStatus,
        projectError,
        saveCurrentProject,
        saveCurrentProjectAs,
        renameCurrentProject,
        exportCurrentProject,
        activateProject,
        resetProjectForImport,
        clearProjectError,
        getPersistenceBlocker,
    } = useProjectContext();
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editMode, setEditMode] = useState<"rename" | "save-as" | null>(null);
    const [projectNameInput, setProjectNameInput] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const [pendingOpenProject, setPendingOpenProject] =
        useState<GeoInsightProject | null>(null);
    const searchParams = new URLSearchParams(location.search);
    const agentOpen = location.pathname === "/workspace" &&
        searchParams.get("panel") === "agent";
    const datasetName = state.dataset?.name ?? "尚未加载数据";

    function beginNameEdit(mode: "rename" | "save-as") {
        setEditMode(mode);
        setProjectNameInput(
            mode === "save-as"
                ? `${projectMeta?.name ?? datasetName}-副本`
                : projectMeta?.name ?? datasetName,
        );
        setLocalError(null);
    }

    async function submitNameEdit() {
        if (editMode === "rename") {
            const error = renameCurrentProject(projectNameInput);

            if (error) {
                setLocalError(error);
                return;
            }

            setEditMode(null);
            return;
        }

        if (editMode === "save-as") {
            const saved = await saveCurrentProjectAs(projectNameInput);

            if (saved) {
                setEditMode(null);
                setMenuOpen(false);
            }
        }
    }

    function openValidatedProject(project: GeoInsightProject) {
        const blocker = getPersistenceBlocker();

        if (blocker) {
            setLocalError(blocker);
            setMenuOpen(true);
            return;
        }

        if (isDirty) {
            setPendingOpenProject(project);
            return;
        }

        activateProject(project);
        setMenuOpen(false);
        navigate("/workspace");
    }

    async function handleProjectFile(file: File) {
        setLocalError(null);

        try {
            openValidatedProject(deserializeProject(await file.text()));
        } catch (error) {
            setLocalError(
                error instanceof Error ? error.message : "无法打开该工程文件。",
            );
        }
    }

    const statusIcon = saveStatus === "saving"
        ? <CloudUpload size={13} />
        : saveStatus === "error"
            ? <AlertCircle size={13} />
            : saveStatus === "saved"
                ? <CheckCircle2 size={13} />
                : <Cloud size={13} />;

    return (
        <header className="topbar">
            <div className="brand">
                <span className="brand-mark">◎</span>
                <span>GeoInsight AI</span>
            </div>

            <nav className="main-nav" aria-label="主导航">
                {navigationItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="topbar-actions">
                {projectMeta && (
                    <div className="project-menu-shell">
                        <button
                            type="button"
                            className="project-menu-trigger"
                            aria-expanded={menuOpen}
                            onClick={() => {
                                setMenuOpen((current) => !current);
                                clearProjectError();
                            }}
                        >
                            <span className="project-menu-name">
                                {projectMeta.name}{isDirty ? " *" : ""}
                            </span>
                            <span
                                className={`project-save-inline ${saveStatus}`}
                                title={SAVE_STATUS_LABELS[saveStatus]}
                            >
                                {statusIcon}
                                <span>{SAVE_STATUS_LABELS[saveStatus]}</span>
                            </span>
                            <ChevronDown size={13} />
                        </button>

                        {menuOpen && (
                            <div className="project-menu" role="menu">
                                <div className={`project-save-state ${saveStatus}`}>
                                    {statusIcon}
                                    <span>{SAVE_STATUS_LABELS[saveStatus]}</span>
                                </div>

                                {editMode ? (
                                    <div className="project-name-editor">
                                        <label>
                                            {editMode === "rename" ? "工程名称" : "另存为"}
                                            <input
                                                autoFocus
                                                maxLength={60}
                                                value={projectNameInput}
                                                onChange={(event) => {
                                                    setProjectNameInput(event.currentTarget.value);
                                                    setLocalError(null);
                                                }}
                                            />
                                        </label>
                                        <div>
                                            <button type="button" onClick={() => setEditMode(null)}>取消</button>
                                            <button type="button" onClick={() => void submitNameEdit()}>确认</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button type="button" role="menuitem" onClick={() => void saveCurrentProject()}>
                                            <Save size={14} />保存
                                        </button>
                                        <button type="button" role="menuitem" onClick={() => beginNameEdit("rename")}>重命名</button>
                                        <button type="button" role="menuitem" onClick={() => beginNameEdit("save-as")}>另存为</button>
                                        <button type="button" role="menuitem" onClick={exportCurrentProject}>导出工程</button>
                                        <button type="button" role="menuitem" onClick={() => fileInputRef.current?.click()}>
                                            <FolderOpen size={14} />打开工程
                                        </button>
                                        <div className="project-menu-divider" />
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                const blocker = getPersistenceBlocker();

                                                if (blocker) {
                                                    setLocalError(blocker);
                                                    return;
                                                }

                                                if (isDirty && !window.confirm("当前工程存在未保存修改，确定放弃并新建工程？")) {
                                                    return;
                                                }

                                                resetProjectForImport();
                                                setMenuOpen(false);
                                                navigate("/import");
                                            }}
                                        >新建工程</button>
                                    </>
                                )}

                                {(localError || projectError) && (
                                    <p className="project-menu-error">{localError ?? projectError}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {!projectMeta && <span className="dataset-chip">{datasetName}</span>}

                <input
                    ref={fileInputRef}
                    className="project-file-input"
                    type="file"
                    accept=".geoinsight,application/json"
                    onChange={(event) => {
                        const file = event.currentTarget.files?.[0];

                        if (file) {
                            void handleProjectFile(file);
                        }

                        event.currentTarget.value = "";
                    }}
                />

                <button
                    type="button"
                    className={agentOpen ? "agent-button active" : "agent-button"}
                    aria-pressed={agentOpen}
                    onClick={() => navigate(agentOpen ? "/workspace" : "/workspace?panel=agent")}
                >
                    ✦ Agent 分析
                </button>
            </div>

            {pendingOpenProject && (
                <div className="project-open-confirm" role="alertdialog" aria-modal="true">
                    <strong>当前工程存在未保存修改</strong>
                    <p>打开“{pendingOpenProject.project.name}”前，请选择如何处理当前修改。</p>
                    <div>
                        <button type="button" onClick={() => setPendingOpenProject(null)}>取消</button>
                        <button
                            type="button"
                            onClick={async () => {
                                if (await saveCurrentProject()) {
                                    activateProject(pendingOpenProject);
                                    setPendingOpenProject(null);
                                    setMenuOpen(false);
                                    navigate("/workspace");
                                }
                            }}
                        >保存后打开</button>
                        <button
                            type="button"
                            onClick={() => {
                                activateProject(pendingOpenProject);
                                setPendingOpenProject(null);
                                setMenuOpen(false);
                                navigate("/workspace");
                            }}
                        >放弃并打开</button>
                    </div>
                </div>
            )}
        </header>
    );
}
