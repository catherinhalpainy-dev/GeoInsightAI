import type {
    TemporalFieldCandidate,
    TemporalFieldType,
} from "../../types/temporal";

interface FeatureLike {
    properties: unknown;
}

interface FeatureCollectionLike {
    features: readonly FeatureLike[];
}

const TEMPORAL_FIELD_PATTERN =
    /(?:^|[_-])(year|date|time|created|updated)(?:$|[_-])|year|date|time|created|updated/i;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseYear(value: unknown) {
    const numeric = typeof value === "number"
        ? value
        : typeof value === "string" && /^\d{4}$/.test(value.trim())
            ? Number(value)
            : Number.NaN;

    return Number.isInteger(numeric) && numeric >= 1900 && numeric <= 2100
        ? numeric
        : null;
}

function parseDateValue(value: unknown) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function inferFieldType(
    field: string,
    values: readonly unknown[],
): TemporalFieldType | null {
    if (values.some((value) => parseYear(value) !== null)) {
        const validYears = values.filter((value) => parseYear(value) !== null);
        if (validYears.length === values.length) {
            return "year";
        }
    }

    const dateValues = values.filter((value) => parseDateValue(value) !== null);
    if (dateValues.length !== values.length) {
        return null;
    }

    return /time|datetime|created|updated/i.test(field) ||
        values.some((value) => typeof value === "string" && /T|\d:\d/.test(value))
        ? "datetime"
        : "date";
}

export function parseTemporalValue(
    value: unknown,
    type: TemporalFieldType,
) {
    return type === "year" ? parseYear(value) : parseDateValue(value);
}

export function readFeatureProperty(properties: unknown, field: string) {
    return isRecord(properties) ? properties[field] : undefined;
}

export function detectTemporalFields(
    collection: FeatureCollectionLike,
): TemporalFieldCandidate[] {
    const valuesByField = new Map<string, unknown[]>();

    for (const feature of collection.features) {
        if (!isRecord(feature.properties)) {
            continue;
        }

        for (const [field, value] of Object.entries(feature.properties)) {
            if (!TEMPORAL_FIELD_PATTERN.test(field) || value === null || value === undefined) {
                continue;
            }

            const values = valuesByField.get(field) ?? [];
            values.push(value);
            valuesByField.set(field, values);
        }
    }

    return [...valuesByField.entries()]
        .flatMap(([field, rawValues]) => {
            const type = inferFieldType(field, rawValues);
            if (!type) {
                return [];
            }

            const values = [...new Set(rawValues.flatMap((value) => {
                const parsed = parseTemporalValue(value, type);
                return parsed === null ? [] : [parsed];
            }))].sort((first, second) => first - second);

            return values.length === 0
                ? []
                : [{
                    field,
                    type,
                    min: values[0],
                    max: values[values.length - 1],
                    validCount: rawValues.length,
                    values,
                }];
        })
        .sort((first, second) =>
            second.validCount - first.validCount ||
            first.field.localeCompare(second.field),
        );
}
