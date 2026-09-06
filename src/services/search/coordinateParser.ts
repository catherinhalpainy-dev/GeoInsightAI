import type {
    CoordinateParseResult,
} from "../../types/search";

const DECIMAL_COORDINATE_PATTERN =
    /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/;

const COORDINATE_FORMAT_MESSAGE =
    "GeoInsight AI 当前坐标输入格式为：经度,纬度";

export function parseCoordinateQuery(
    query: string,
): CoordinateParseResult {
    const normalized = query.trim();

    if (!normalized.includes(",")) {
        return {
            result: null,
            error: null,
        };
    }

    if (!/^[\s+\-\d.,]+$/.test(normalized)) {
        return {
            result: null,
            error: null,
        };
    }

    const match = DECIMAL_COORDINATE_PATTERN.exec(normalized);

    if (!match) {
        return {
            result: null,
            error: COORDINATE_FORMAT_MESSAGE,
        };
    }

    const longitude = Number(match[1]);
    const latitude = Number(match[2]);

    if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
    ) {
        return {
            result: null,
            error: COORDINATE_FORMAT_MESSAGE,
        };
    }

    const coordinateLabel = `${longitude}, ${latitude}`;

    return {
        result: {
            type: "coordinate",
            id: `coordinate:${longitude}:${latitude}`,
            longitude,
            latitude,
            title: coordinateLabel,
            subtitle: `经度 ${longitude} · 纬度 ${latitude}`,
        },
        error: null,
    };
}
