export type TemporalFieldType =
    | "year"
    | "date"
    | "datetime";

export interface TemporalConfig {
    enabled: boolean;
    field: string;
    type: TemporalFieldType;
    min: number;
    max: number;
    current: number;
}

export interface TemporalRange {
    start: number;
    end: number;
}

export interface TemporalStatistics {
    currentTime: number;
    featureCount: number;
    totalAreaM2: number;
    previousFeatureCount: number;
    changeCount: number;
}

export interface TemporalFieldCandidate {
    field: string;
    type: TemporalFieldType;
    min: number;
    max: number;
    validCount: number;
    values: number[];
}

export interface TemporalChangeSummary {
    currentTime: number;
    previousTime: number | null;
    added: string[];
    removed: string[];
    changed: string[];
}

export const DEFAULT_TEMPORAL_CONFIG: TemporalConfig = {
    enabled: false,
    field: "",
    type: "year",
    min: 0,
    max: 0,
    current: 0,
};
