import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import {
    useAppContext,
} from "../app/AppProvider";
import {
    exportProjectFile,
} from "../services/project/projectFile";
import {
    createProjectSnapshot,
} from "../services/project/projectSerializer";
import {
    deleteProject as deleteStoredProject,
    listProjects,
    loadProject,
    saveProject,
} from "../services/project/projectStorage";
import type {
    GeoInsightProject,
    ProjectMetadata,
    ProjectSaveStatus,
    ProjectSnapshotInput,
    RecentProjectMetadata,
} from "../types/project";

const LAST_PROJECT_ID_KEY = "geoinsight:last-project-id";
const AUTO_SAVE_DELAY_MS = 2_000;

function readLastProjectId() {
    try {
        return localStorage.getItem(LAST_PROJECT_ID_KEY);
    } catch {
        return null;
    }
}

function writeLastProjectId(projectId: string) {
    try {
        localStorage.setItem(LAST_PROJECT_ID_KEY, projectId);
    } catch {
        // IndexedDB remains the source of truth when localStorage is unavailable.
    }
}

function clearLastProjectId(projectId: string) {
    try {
        if (localStorage.getItem(LAST_PROJECT_ID_KEY) === projectId) {
            localStorage.removeItem(LAST_PROJECT_ID_KEY);
            return true;
        }
    } catch {
        return false;
    }

    return false;
}

export interface ProjectWorkspaceController {
    createSnapshotInput: (
        metadata: ProjectMetadata,
    ) => ProjectSnapshotInput | null;
    getPersistenceBlocker: () => string | null;
}

interface ProjectContextValue {
    projectMeta: ProjectMetadata | null;
    isDirty: boolean;
    saveStatus: ProjectSaveStatus;
    projectError: string | null;
    recentProjects: RecentProjectMetadata[];
    lastProjectId: string | null;
    pendingProject: GeoInsightProject | null;
    registerWorkspaceController: (
        controller: ProjectWorkspaceController | null,
    ) => void;
    notifyPersistenceStateChange: () => void;
    getPersistenceBlocker: () => string | null;
    markProjectDirty: () => void;
    startNewProject: (name: string) => void;
    resetProjectForImport: () => void;
    saveCurrentProject: () => Promise<boolean>;
    saveCurrentProjectAs: (name: string) => Promise<boolean>;
    renameCurrentProject: (name: string) => string | null;
    exportCurrentProject: () => boolean;
    activateProject: (project: GeoInsightProject) => void;
    openStoredProject: (projectId: string) => Promise<GeoInsightProject | null>;
    completeProjectRestore: (projectId: string) => void;
    removeStoredProject: (projectId: string) => Promise<void>;
    refreshRecentProjects: () => Promise<void>;
    clearProjectError: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function normalizeProjectName(name: string) {
    const normalized = name.trim();

    if (normalized.length < 1 || normalized.length > 60) {
        return null;
    }

    return normalized;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
    const { dispatch } = useAppContext();
    const [projectMeta, setProjectMeta] = useState<ProjectMetadata | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState<ProjectSaveStatus>("idle");
    const [projectError, setProjectError] = useState<string | null>(null);
    const [recentProjects, setRecentProjects] =
        useState<RecentProjectMetadata[]>([]);
    const [lastProjectId, setLastProjectId] = useState<string | null>(
        readLastProjectId,
    );
    const [pendingProject, setPendingProject] =
        useState<GeoInsightProject | null>(null);
    const [controllerReady, setControllerReady] = useState(false);
    const [persistenceEpoch, setPersistenceEpoch] = useState(0);
    const controllerRef = useRef<ProjectWorkspaceController | null>(null);
    const projectMetaRef = useRef<ProjectMetadata | null>(projectMeta);
    const activeProjectSnapshotRef = useRef<GeoInsightProject | null>(null);
    const workspaceDetachedRef = useRef(false);
    const detachTimerRef = useRef<number | null>(null);
    const activeProjectIdRef = useRef<string | null>(null);
    const projectSessionRef = useRef(0);
    const revisionRef = useRef(0);
    const [revision, setRevision] = useState(0);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
    projectMetaRef.current = projectMeta;

    const refreshRecentProjects = useCallback(async () => {
        try {
            setRecentProjects((await listProjects()).slice(0, 5));
        } catch (error) {
            setProjectError(
                error instanceof Error
                    ? error.message
                    : "无法读取最近工程。",
            );
        }
    }, []);

    useEffect(() => {
        void refreshRecentProjects();
    }, [refreshRecentProjects]);

    const registerWorkspaceController = useCallback((
        controller: ProjectWorkspaceController | null,
    ) => {
        if (controller) {
            if (detachTimerRef.current !== null) {
                window.clearTimeout(detachTimerRef.current);
                detachTimerRef.current = null;
            }

            controllerRef.current = controller;
            setControllerReady(true);

            const suspendedProject = activeProjectSnapshotRef.current;

            if (
                workspaceDetachedRef.current &&
                suspendedProject?.project.id === projectMetaRef.current?.id
            ) {
                setPendingProject(suspendedProject);
            }

            workspaceDetachedRef.current = false;
            return;
        }

        const detachedController = controllerRef.current;
        controllerRef.current = controller;
        setControllerReady(false);

        detachTimerRef.current = window.setTimeout(() => {
            detachTimerRef.current = null;
            workspaceDetachedRef.current = true;

            const metadata = projectMetaRef.current;
            const blocker = detachedController?.getPersistenceBlocker() ?? null;
            const input = metadata
                ? detachedController?.createSnapshotInput(metadata) ?? null
                : null;

            if (!input) {
                return;
            }

            const snapshot = createProjectSnapshot(input);
            activeProjectSnapshotRef.current = snapshot;

            if (blocker) {
                return;
            }

            const savingRevision = revisionRef.current;
            const savingSession = projectSessionRef.current;
            const queuedSave = saveQueueRef.current.then(() => saveProject(snapshot));
            saveQueueRef.current = queuedSave.catch(() => undefined);
            setSaveStatus("saving");

            void queuedSave.then(async () => {
                await refreshRecentProjects();

                if (
                    projectSessionRef.current !== savingSession ||
                    activeProjectIdRef.current !== snapshot.project.id
                ) {
                    return;
                }

                setProjectMeta(snapshot.project);
                writeLastProjectId(snapshot.project.id);
                setLastProjectId(snapshot.project.id);

                if (revisionRef.current === savingRevision) {
                    setIsDirty(false);
                    setSaveStatus("saved");
                }
            }).catch((error: unknown) => {
                if (projectSessionRef.current !== savingSession) {
                    return;
                }

                setSaveStatus("error");
                setProjectError(
                    error instanceof Error
                        ? `保存失败：${error.message}`
                        : "保存失败，本地存储不可用。",
                );
            });
        }, 0);
    }, [refreshRecentProjects]);

    const notifyPersistenceStateChange = useCallback(() => {
        setPersistenceEpoch((current) => current + 1);
    }, []);

    const getPersistenceBlocker = useCallback(
        () => controllerRef.current?.getPersistenceBlocker() ?? null,
        [],
    );

    const markProjectDirty = useCallback(() => {
        if (!projectMeta) {
            return;
        }

        revisionRef.current += 1;
        setRevision(revisionRef.current);
        setIsDirty(true);
        setSaveStatus("unsaved");
    }, [projectMeta]);

    const persistSnapshot = useCallback(async (
        metadata: ProjectMetadata,
        savingRevision: number,
    ) => {
        const controller = controllerRef.current;
        const blocker = controller?.getPersistenceBlocker() ?? null;

        if (!controller) {
            setProjectError("地图工作区尚未准备完成，无法保存工程。");
            return false;
        }

        if (blocker) {
            setProjectError(blocker);
            setSaveStatus("unsaved");
            return false;
        }

        const input = controller.createSnapshotInput(metadata);

        if (!input) {
            setProjectError("当前没有可保存的主数据集。");
            return false;
        }

        const snapshot = createProjectSnapshot(input);
        activeProjectSnapshotRef.current = snapshot;
        const savingSession = projectSessionRef.current;
        setSaveStatus("saving");
        setProjectError(null);

        const queuedSave = saveQueueRef.current.then(
            () => saveProject(snapshot),
        );
        saveQueueRef.current = queuedSave.catch(() => undefined);

        try {
            await queuedSave;
            await refreshRecentProjects();

            if (
                projectSessionRef.current !== savingSession ||
                activeProjectIdRef.current !== snapshot.project.id
            ) {
                return true;
            }

            setProjectMeta(snapshot.project);
            writeLastProjectId(snapshot.project.id);
            setLastProjectId(snapshot.project.id);

            if (revisionRef.current === savingRevision) {
                setIsDirty(false);
                setSaveStatus("saved");
            } else {
                setSaveStatus("unsaved");
            }

            return true;
        } catch (error) {
            setSaveStatus("error");
            setProjectError(
                error instanceof Error
                    ? `保存失败：${error.message}`
                    : "保存失败，本地存储不可用。",
            );
            return false;
        }
    }, [refreshRecentProjects]);

    const saveCurrentProject = useCallback(async () => {
        if (!projectMeta) {
            setProjectError("当前没有活动工程。");
            return false;
        }

        return persistSnapshot(projectMeta, revisionRef.current);
    }, [persistSnapshot, projectMeta]);

    const saveCurrentProjectAs = useCallback(async (name: string) => {
        const normalized = normalizeProjectName(name);

        if (!projectMeta || !normalized) {
            setProjectError("工程名称必须为 1–60 个字符。");
            return false;
        }

        const now = Date.now();
        const metadata: ProjectMetadata = {
            id: crypto.randomUUID(),
            name: normalized,
            createdAt: now,
            updatedAt: now,
        };
        revisionRef.current += 1;
        setRevision(revisionRef.current);
        projectSessionRef.current += 1;
        activeProjectIdRef.current = metadata.id;
        activeProjectSnapshotRef.current = null;
        setProjectMeta(metadata);
        setIsDirty(true);

        return persistSnapshot(metadata, revisionRef.current);
    }, [persistSnapshot, projectMeta]);

    const renameCurrentProject = useCallback((name: string) => {
        const normalized = normalizeProjectName(name);

        if (!projectMeta || !normalized) {
            return "工程名称必须为 1–60 个字符。";
        }

        setProjectMeta({
            ...projectMeta,
            name: normalized,
            updatedAt: Date.now(),
        });
        markProjectDirty();
        return null;
    }, [markProjectDirty, projectMeta]);

    const exportCurrentProject = useCallback(() => {
        if (!projectMeta) {
            setProjectError("当前没有活动工程。");
            return false;
        }

        const controller = controllerRef.current;
        const blocker = controller?.getPersistenceBlocker() ?? null;

        if (!controller || blocker) {
            setProjectError(blocker ?? "地图工作区尚未准备完成。");
            return false;
        }

        const input = controller.createSnapshotInput(projectMeta);

        if (!input) {
            setProjectError("当前没有可导出的主数据集。");
            return false;
        }

        exportProjectFile(createProjectSnapshot(input));
        setProjectError(null);
        return true;
    }, [projectMeta]);

    const startNewProject = useCallback((name: string) => {
        const now = Date.now();
        const metadata: ProjectMetadata = {
            id: crypto.randomUUID(),
            name: normalizeProjectName(name) ?? "未命名工程",
            createdAt: now,
            updatedAt: now,
        };

        revisionRef.current += 1;
        setRevision(revisionRef.current);
        projectSessionRef.current += 1;
        activeProjectIdRef.current = metadata.id;
        activeProjectSnapshotRef.current = null;
        setProjectMeta(metadata);
        setPendingProject(null);
        setIsDirty(true);
        setSaveStatus("unsaved");
        setProjectError(null);
    }, []);

    const resetProjectForImport = useCallback(() => {
        projectSessionRef.current += 1;
        activeProjectIdRef.current = null;
        activeProjectSnapshotRef.current = null;
        workspaceDetachedRef.current = false;
        setProjectMeta(null);
        setPendingProject(null);
        setIsDirty(false);
        setSaveStatus("idle");
        setProjectError(null);
    }, []);

    const activateProject = useCallback((project: GeoInsightProject) => {
        dispatch({
            type: "RESTORE_PROJECT_DATA",
            payload: {
                dataset: project.data.primaryDataset,
                filters: project.workspace.filters,
                attributeQuery: project.workspace.attributeQuery,
            },
        });
        projectSessionRef.current += 1;
        const activationSession = projectSessionRef.current;
        activeProjectIdRef.current = project.project.id;
        activeProjectSnapshotRef.current = project;
        workspaceDetachedRef.current = false;
        setProjectMeta(project.project);
        setPendingProject(project);
        setIsDirty(false);
        setSaveStatus("saved");
        setProjectError(null);
        revisionRef.current += 1;
        setRevision(revisionRef.current);
        writeLastProjectId(project.project.id);
        setLastProjectId(project.project.id);
        const queuedSave = saveQueueRef.current.then(() => saveProject(project));
        saveQueueRef.current = queuedSave.catch(() => undefined);
        void queuedSave
            .then(refreshRecentProjects)
            .catch((error: unknown) => {
                if (projectSessionRef.current !== activationSession) {
                    return;
                }

                setSaveStatus("error");
                setProjectError(
                    error instanceof Error
                        ? `工程已打开，但无法写入本地存储：${error.message}`
                        : "工程已打开，但无法写入本地存储。",
                );
            });
    }, [dispatch, refreshRecentProjects]);

    const openStoredProject = useCallback(async (projectId: string) => {
        try {
            const project = await loadProject(projectId);

            if (!project) {
                setProjectError("找不到该本地工程，记录可能已被删除。");
            }

            return project;
        } catch (error) {
            setProjectError(
                error instanceof Error
                    ? error.message
                    : "无法打开本地工程。",
            );
            return null;
        }
    }, []);

    const completeProjectRestore = useCallback((projectId: string) => {
        setPendingProject((current) =>
            current?.project.id === projectId ? null : current,
        );
        setIsDirty(false);
        setSaveStatus("saved");
    }, []);

    const removeStoredProject = useCallback(async (projectId: string) => {
        await deleteStoredProject(projectId);

        if (clearLastProjectId(projectId)) {
            setLastProjectId(null);
        }

        await refreshRecentProjects();
    }, [refreshRecentProjects]);

    useEffect(() => {
        if (!isDirty || !projectMeta || !controllerReady) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void persistSnapshot(projectMeta, revision);
        }, AUTO_SAVE_DELAY_MS);

        return () => window.clearTimeout(timeoutId);
    }, [
        controllerReady,
        isDirty,
        persistSnapshot,
        persistenceEpoch,
        projectMeta,
        revision,
    ]);

    const value = useMemo<ProjectContextValue>(() => ({
        projectMeta,
        isDirty,
        saveStatus,
        projectError,
        recentProjects,
        lastProjectId,
        pendingProject,
        registerWorkspaceController,
        notifyPersistenceStateChange,
        getPersistenceBlocker,
        markProjectDirty,
        startNewProject,
        resetProjectForImport,
        saveCurrentProject,
        saveCurrentProjectAs,
        renameCurrentProject,
        exportCurrentProject,
        activateProject,
        openStoredProject,
        completeProjectRestore,
        removeStoredProject,
        refreshRecentProjects,
        clearProjectError: () => setProjectError(null),
    }), [
        activateProject,
        completeProjectRestore,
        exportCurrentProject,
        getPersistenceBlocker,
        isDirty,
        lastProjectId,
        markProjectDirty,
        notifyPersistenceStateChange,
        openStoredProject,
        pendingProject,
        projectError,
        projectMeta,
        recentProjects,
        refreshRecentProjects,
        registerWorkspaceController,
        removeStoredProject,
        renameCurrentProject,
        resetProjectForImport,
        saveCurrentProject,
        saveCurrentProjectAs,
        saveStatus,
        startNewProject,
    ]);

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

// oxlint-disable-next-line react/only-export-components
export function useProjectContext() {
    const context = useContext(ProjectContext);

    if (!context) {
        throw new Error("useProjectContext must be used inside ProjectProvider");
    }

    return context;
}
