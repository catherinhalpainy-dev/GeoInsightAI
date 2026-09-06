import {
    Box,
    Clock3,
    Command,
    CornerDownLeft,
    Layers3,
    MapPin,
    Search,
    X,
} from "lucide-react";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useRecentSearches,
} from "../../hooks/useRecentSearches";
import {
    parseCoordinateQuery,
} from "../../services/search/coordinateParser";
import {
    searchWorkspaceIndex,
} from "../../services/search/workspaceSearch";
import type {
    RecentSearchEntry,
    WorkspaceSearchDocument,
    WorkspaceSearchResult,
} from "../../types/search";
import "../../styles/globalSearch.css";

interface GlobalSearchDialogProps {
    open: boolean;
    index: readonly WorkspaceSearchDocument[];
    onClose: () => void;
    onExecute: (result: WorkspaceSearchResult) => boolean;
    getDisabledReason: (result: WorkspaceSearchResult) => string | null;
}

const GROUPS: readonly {
    type: WorkspaceSearchResult["type"];
    label: string;
}[] = [
    { type: "feature", label: "要素" },
    { type: "layer", label: "图层" },
    { type: "coordinate", label: "坐标" },
    { type: "command", label: "命令" },
];

const QUICK_COMMAND_IDS = new Set([
    "open-data-quality",
    "open-layer-style",
    "open-geoprocessing",
    "open-aoi-analysis",
]);

function ResultIcon({ type }: { type: WorkspaceSearchResult["type"] }) {
    const iconProps = {
        size: 17,
        strokeWidth: 1.8,
        "aria-hidden": true,
    } as const;

    switch (type) {
        case "feature":
            return <Box {...iconProps} />;
        case "layer":
            return <Layers3 {...iconProps} />;
        case "coordinate":
            return <MapPin {...iconProps} />;
        case "command":
            return <Command {...iconProps} />;
    }
}

export function GlobalSearchDialog({
    open,
    index,
    onClose,
    onExecute,
    getDisabledReason,
}: GlobalSearchDialogProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const {
        recentSearches,
        recordRecentSearch,
        clearRecentSearches,
    } = useRecentSearches();
    const coordinate = useMemo(
        () => parseCoordinateQuery(query),
        [query],
    );
    const textResults = useMemo(
        () => searchWorkspaceIndex(index, query),
        [index, query],
    );
    const groupedResults = useMemo(() => {
        const allResults: WorkspaceSearchResult[] = [
            ...textResults,
            ...(coordinate.result ? [coordinate.result] : []),
        ];

        return GROUPS.map((group) => ({
            ...group,
            results: allResults
                .filter((result) => result.type === group.type)
                .slice(0, 7),
        })).filter((group) => group.results.length > 0);
    }, [coordinate.result, textResults]);
    const visibleResults = useMemo(
        () => groupedResults.flatMap((group) => group.results),
        [groupedResults],
    );
    const quickCommands = useMemo(
        () => index
            .map((document) => document.result)
            .filter((result) =>
                result.type === "command" &&
                QUICK_COMMAND_IDS.has(result.commandId),
            )
            .slice(0, 4),
        [index],
    );
    const keyboardResults = query.trim()
        ? visibleResults
        : quickCommands;

    useEffect(() => {
        if (!open) {
            return;
        }

        setQuery("");
        setActiveIndex(0);
        const frame = window.requestAnimationFrame(
            () => inputRef.current?.focus(),
        );

        return () => window.cancelAnimationFrame(frame);
    }, [open]);

    function executeResult(result: WorkspaceSearchResult) {
        if (getDisabledReason(result)) {
            return;
        }

        if (onExecute(result)) {
            recordRecentSearch(query, result);
            onClose();
        }
    }

    const executeResultRef = useRef(executeResult);
    executeResultRef.current = executeResult;

    function resolveRecent(entry: RecentSearchEntry) {
        const indexedResult = index.find(
            (document) => document.result.id === entry.resultId,
        )?.result;

        if (indexedResult) {
            executeResult(indexedResult);
            return;
        }

        const parsedCoordinate = parseCoordinateQuery(entry.query).result;

        if (parsedCoordinate && entry.resultType === "coordinate") {
            executeResult(parsedCoordinate);
            return;
        }

        setQuery(entry.query);
        setActiveIndex(0);
    }

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopImmediatePropagation();
                onClose();
                return;
            }

            if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) =>
                    keyboardResults.length === 0
                        ? 0
                        : (current + 1) % keyboardResults.length,
                );
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) =>
                    keyboardResults.length === 0
                        ? 0
                        : (current - 1 + keyboardResults.length) %
                            keyboardResults.length,
                );
                return;
            }

            if (event.key === "Enter") {
                const result = keyboardResults[activeIndex];

                if (result) {
                    event.preventDefault();
                    executeResultRef.current(result);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [activeIndex, keyboardResults, onClose, open]);

    if (!open) {
        return null;
    }

    const hasQuery = query.trim().length > 0;
    const hasResults = visibleResults.length > 0;

    function renderResult(result: WorkspaceSearchResult) {
        const resultIndex = keyboardResults.findIndex(
            (item) => item.id === result.id,
        );
        const disabledReason = getDisabledReason(result);

        return (
            <button
                key={result.id}
                type="button"
                className={resultIndex === activeIndex ? "active" : undefined}
                disabled={disabledReason !== null}
                role="option"
                aria-selected={resultIndex === activeIndex}
                onMouseEnter={() => {
                    if (resultIndex >= 0) {
                        setActiveIndex(resultIndex);
                    }
                }}
                onClick={() => executeResult(result)}
            >
                <span className={`global-search-result-icon ${result.type}`}>
                    <ResultIcon type={result.type} />
                </span>
                <span className="global-search-result-copy">
                    <strong>{result.title}</strong>
                    <small>{disabledReason ?? result.subtitle}</small>
                </span>
                {resultIndex === activeIndex && !disabledReason && (
                    <CornerDownLeft size={14} aria-hidden="true" />
                )}
            </button>
        );
    }

    return (
        <div
            className="global-search-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className="global-search-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="搜索 GeoInsight AI"
            >
                <header className="global-search-input-row">
                    <Search size={19} aria-hidden="true" />
                    <input
                        ref={inputRef}
                        value={query}
                        placeholder="搜索地块、图层、坐标或命令..."
                        aria-label="搜索地块、图层、坐标或命令"
                        onChange={(event) => {
                            setQuery(event.currentTarget.value);
                            setActiveIndex(0);
                        }}
                    />
                    {query && (
                        <button
                            type="button"
                            aria-label="清空搜索"
                            onClick={() => {
                                setQuery("");
                                setActiveIndex(0);
                                inputRef.current?.focus();
                            }}
                        >
                            <X size={15} aria-hidden="true" />
                        </button>
                    )}
                    <kbd>ESC</kbd>
                </header>

                <div className="global-search-content" role="listbox">
                    {!hasQuery && (
                        <>
                            <section className="global-search-section">
                                <header>
                                    <span><Clock3 size={13} />最近搜索</span>
                                    {recentSearches.length > 0 && (
                                        <button type="button" onClick={clearRecentSearches}>
                                            清除
                                        </button>
                                    )}
                                </header>
                                {recentSearches.length > 0 ? (
                                    <div className="global-search-recents">
                                        {recentSearches.slice(0, 6).map((entry) => (
                                            <button
                                                key={`${entry.resultId}-${entry.timestamp}`}
                                                type="button"
                                                onClick={() => resolveRecent(entry)}
                                            >
                                                <Clock3 size={14} aria-hidden="true" />
                                                <span>{entry.label}</span>
                                                <small>{entry.query}</small>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="global-search-empty-small">暂无最近搜索</p>
                                )}
                            </section>

                            <section className="global-search-section">
                                <header><span><Command size={13} />快捷命令</span></header>
                                <div className="global-search-result-list">
                                    {quickCommands.map(renderResult)}
                                </div>
                            </section>
                        </>
                    )}

                    {hasQuery && groupedResults.map((group) => (
                        <section className="global-search-section" key={group.type}>
                            <header><span>{group.label}</span></header>
                            <div className="global-search-result-list">
                                {group.results.map(renderResult)}
                            </div>
                        </section>
                    ))}

                    {hasQuery && coordinate.error && (
                        <p className="global-search-coordinate-error">
                            {coordinate.error}
                        </p>
                    )}

                    {hasQuery && !hasResults && !coordinate.error && (
                        <div className="global-search-empty">
                            <strong>未找到匹配结果</strong>
                            <span>可搜索：地块 ID、图层名称、经纬度或工具名称</span>
                        </div>
                    )}
                </div>

                <footer>
                    <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
                    <span><kbd>Enter</kbd> 执行</span>
                    <span>本地确定性搜索，不调用 Agent</span>
                </footer>
            </section>
        </div>
    );
}
