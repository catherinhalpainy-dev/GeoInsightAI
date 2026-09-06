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
    useNavigate,
} from "react-router-dom";

import {
    useAppContext,
} from "../app/AppProvider";
import {
    GlobalSearchDialog,
} from "../components/search/GlobalSearchDialog";
import {
    getWorkspaceCommand,
} from "../constants/workspaceCommands";
import {
    buildWorkspaceSearchIndex,
} from "../services/search/workspaceSearch";
import type {
    WorkspaceSearchDocument,
    WorkspaceSearchResult,
} from "../types/search";

export interface WorkspaceSearchController {
    index: readonly WorkspaceSearchDocument[];
    execute: (result: WorkspaceSearchResult) => boolean;
    getDisabledReason: (result: WorkspaceSearchResult) => string | null;
}

interface GlobalSearchContextValue {
    openSearch: () => void;
    closeSearch: () => void;
    registerWorkspaceSearch: (
        controller: WorkspaceSearchController | null,
    ) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
    const { state } = useAppContext();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState<readonly WorkspaceSearchDocument[]>(
        () => buildWorkspaceSearchIndex(state.dataset, [], []),
    );
    const controllerRef = useRef<WorkspaceSearchController | null>(null);
    const pendingResultRef = useRef<WorkspaceSearchResult | null>(null);
    const indexedDatasetIdRef = useRef(state.dataset?.id ?? null);

    const openSearch = useCallback(() => setOpen(true), []);
    const closeSearch = useCallback(() => setOpen(false), []);

    const registerWorkspaceSearch = useCallback((
        controller: WorkspaceSearchController | null,
    ) => {
        controllerRef.current = controller;

        if (!controller) {
            return;
        }

        setIndex(controller.index);
        const pendingResult = pendingResultRef.current;

        if (pendingResult) {
            pendingResultRef.current = null;
            window.queueMicrotask(() => controller.execute(pendingResult));
        }
    }, []);

    useEffect(() => {
        const datasetId = state.dataset?.id ?? null;

        if (
            controllerRef.current ||
            indexedDatasetIdRef.current === datasetId
        ) {
            return;
        }

        indexedDatasetIdRef.current = datasetId;
        setIndex(buildWorkspaceSearchIndex(state.dataset, [], []));
    }, [state.dataset]);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLocaleLowerCase() === "k"
            ) {
                event.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, []);

    function getFallbackDisabledReason(result: WorkspaceSearchResult) {
        if (result.type === "coordinate") {
            return null;
        }

        if (result.type !== "command") {
            return state.dataset ? null : "请先导入主数据集";
        }

        const command = getWorkspaceCommand(result.commandId);

        if (command?.requiredState === "dataset" && !state.dataset) {
            return "请先导入主数据集";
        }

        if (command?.requiredState === "selection") {
            return "请先在地图工作台选择地块";
        }

        return null;
    }

    function getDisabledReason(result: WorkspaceSearchResult) {
        return controllerRef.current?.getDisabledReason(result) ??
            getFallbackDisabledReason(result);
    }

    function executeResult(result: WorkspaceSearchResult) {
        const controller = controllerRef.current;

        if (controller) {
            return controller.execute(result);
        }

        if (getFallbackDisabledReason(result)) {
            return false;
        }

        if (
            result.type === "command" &&
            result.commandId === "navigate-statistics"
        ) {
            navigate("/statistics");
            return true;
        }

        if (
            result.type === "command" &&
            result.commandId === "navigate-report"
        ) {
            navigate("/report");
            return true;
        }

        pendingResultRef.current = result;
        navigate("/workspace");
        return true;
    }

    const value = useMemo<GlobalSearchContextValue>(() => ({
        openSearch,
        closeSearch,
        registerWorkspaceSearch,
    }), [closeSearch, openSearch, registerWorkspaceSearch]);

    return (
        <GlobalSearchContext.Provider value={value}>
            {children}
            <GlobalSearchDialog
                open={open}
                index={index}
                onClose={closeSearch}
                onExecute={executeResult}
                getDisabledReason={getDisabledReason}
            />
        </GlobalSearchContext.Provider>
    );
}

// oxlint-disable-next-line react/only-export-components
export function useGlobalSearch() {
    const context = useContext(GlobalSearchContext);

    if (!context) {
        throw new Error("useGlobalSearch must be used inside GlobalSearchProvider");
    }

    return context;
}
