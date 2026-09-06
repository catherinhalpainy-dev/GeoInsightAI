import {
    useState,
} from "react";

import type {
    RecentSearchEntry,
    WorkspaceSearchResult,
} from "../types/search";

const RECENT_SEARCH_STORAGE_KEY = "geoinsight:recent-searches";
const RECENT_SEARCH_LIMIT = 10;
const RESULT_TYPES = new Set([
    "feature",
    "layer",
    "coordinate",
    "command",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecentSearches() {
    try {
        const raw = localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);

        if (!raw) {
            return [];
        }

        const parsed: unknown = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.flatMap((entry): RecentSearchEntry[] => {
            if (
                !isRecord(entry) ||
                typeof entry.query !== "string" ||
                typeof entry.resultType !== "string" ||
                !RESULT_TYPES.has(entry.resultType) ||
                typeof entry.resultId !== "string" ||
                typeof entry.label !== "string" ||
                typeof entry.timestamp !== "number" ||
                !Number.isFinite(entry.timestamp)
            ) {
                return [];
            }

            return [{
                query: entry.query,
                resultType: entry.resultType as RecentSearchEntry["resultType"],
                resultId: entry.resultId,
                label: entry.label,
                timestamp: entry.timestamp,
            }];
        }).slice(0, RECENT_SEARCH_LIMIT);
    } catch {
        return [];
    }
}

function persistRecentSearches(entries: readonly RecentSearchEntry[]) {
    try {
        localStorage.setItem(
            RECENT_SEARCH_STORAGE_KEY,
            JSON.stringify(entries),
        );
    } catch {
        // Search history remains available for the current session.
    }
}

export function useRecentSearches() {
    const [recentSearches, setRecentSearches] =
        useState<RecentSearchEntry[]>(readRecentSearches);

    function recordRecentSearch(
        query: string,
        result: WorkspaceSearchResult,
    ) {
        const entry: RecentSearchEntry = {
            query: query.trim() || result.title,
            resultType: result.type,
            resultId: result.id,
            label: result.title,
            timestamp: Date.now(),
        };

        setRecentSearches((previous) => {
            const next = [
                entry,
                ...previous.filter(
                    (item) => item.resultId !== result.id,
                ),
            ].slice(0, RECENT_SEARCH_LIMIT);

            persistRecentSearches(next);
            return next;
        });
    }

    function clearRecentSearches() {
        setRecentSearches([]);

        try {
            localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
        } catch {
            // The in-memory history is still cleared.
        }
    }

    return {
        recentSearches,
        recordRecentSearch,
        clearRecentSearches,
    };
}
