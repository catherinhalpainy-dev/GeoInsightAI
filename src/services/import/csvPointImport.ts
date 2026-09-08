import Papa from "papaparse";
import type { Feature, Point } from "geojson";

import { createDefaultOverlayLayerStyle } from "../../constants/overlayLayerStyles";
import type { WorkspaceVectorLayer } from "../../types/mapLayer";

export type CsvRow = Record<string, string>;

export interface CsvPointImportDocument {
    filename: string;
    suggestedLayerName: string;
    headers: string[];
    rows: CsvRow[];
    totalRows: number;
    suggestedLongitudeField: string | null;
    suggestedLatitudeField: string | null;
    warnings: string[];
}

export interface CsvCoordinateSummary {
    validRows: number;
    skippedRows: number;
}

export interface CreateCsvPointLayerOptions {
    name: string;
    longitudeField: string;
    latitudeField: string;
    styleIndex: number;
}

export interface CsvPointLayerResult extends CsvCoordinateSummary {
    layer: WorkspaceVectorLayer;
}

const LONGITUDE_ALIASES = new Set([
    "longitude",
    "lon",
    "lng",
    "x",
    "经度",
]);

const LATITUDE_ALIASES = new Set([
    "latitude",
    "lat",
    "y",
    "纬度",
]);

function createLayerName(filename: string) {
    return filename.replace(/\.csv$/i, "").trim() || "csv-points";
}

function findSuggestedField(
    headers: readonly string[],
    aliases: ReadonlySet<string>,
) {
    return headers.find(
        (header) => aliases.has(header.trim().toLocaleLowerCase()),
    ) ?? null;
}

function parseCoordinate(value: string | undefined) {
    if (value === undefined || value.trim() === "") {
        return null;
    }

    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
}

function isValidCoordinate(longitude: number | null, latitude: number | null) {
    return longitude !== null &&
        latitude !== null &&
        longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90;
}

function getValidCoordinate(
    longitudeValue: string | undefined,
    latitudeValue: string | undefined,
): [number, number] | null {
    const longitude = parseCoordinate(longitudeValue);
    const latitude = parseCoordinate(latitudeValue);

    if (longitude === null || latitude === null) {
        return null;
    }

    return isValidCoordinate(longitude, latitude)
        ? [longitude, latitude]
        : null;
}

export function parseCsvPointText(
    text: string,
    filename: string,
): CsvPointImportDocument {
    const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => header.trim(),
    });
    const headers = (result.meta.fields ?? [])
        .map((header) => header.trim())
        .filter(Boolean);

    if (headers.length === 0) {
        throw new Error("CSV 缺少有效表头。");
    }

    const fatalError = result.errors.find(
        (error) => error.type === "Quotes" || error.code === "UndetectableDelimiter",
    );

    if (fatalError) {
        throw new Error(`CSV 解析失败：${fatalError.message}`);
    }

    const rows = result.data.map((row) => {
        const normalized: CsvRow = {};

        for (const header of headers) {
            const value = row[header];
            normalized[header] = typeof value === "string" ? value : "";
        }

        return normalized;
    });

    if (rows.length === 0) {
        throw new Error("CSV 不包含可导入的数据行。");
    }

    return {
        filename,
        suggestedLayerName: createLayerName(filename),
        headers,
        rows,
        totalRows: rows.length,
        suggestedLongitudeField: findSuggestedField(headers, LONGITUDE_ALIASES),
        suggestedLatitudeField: findSuggestedField(headers, LATITUDE_ALIASES),
        warnings: result.errors.map((error) => error.message).slice(0, 5),
    };
}

export async function parseCsvPointFile(file: File) {
    let text: string;

    try {
        text = await file.text();
    } catch {
        throw new Error("无法读取 CSV 文件。");
    }

    return parseCsvPointText(text, file.name);
}

export function analyzeCsvCoordinates(
    document: CsvPointImportDocument,
    longitudeField: string,
    latitudeField: string,
): CsvCoordinateSummary {
    if (
        longitudeField === latitudeField ||
        !document.headers.includes(longitudeField) ||
        !document.headers.includes(latitudeField)
    ) {
        return {
            validRows: 0,
            skippedRows: document.totalRows,
        };
    }

    let validRows = 0;

    for (const row of document.rows) {
        const longitude = parseCoordinate(row[longitudeField]);
        const latitude = parseCoordinate(row[latitudeField]);

        if (isValidCoordinate(longitude, latitude)) {
            validRows += 1;
        }
    }

    return {
        validRows,
        skippedRows: document.totalRows - validRows,
    };
}

export function createCsvPointLayer(
    document: CsvPointImportDocument,
    options: CreateCsvPointLayerOptions,
): CsvPointLayerResult {
    if (options.longitudeField === options.latitudeField) {
        throw new Error("经度字段与纬度字段不能相同。");
    }

    const features: Feature<Point, CsvRow>[] = [];

    for (const row of document.rows) {
        const coordinate = getValidCoordinate(
            row[options.longitudeField],
            row[options.latitudeField],
        );

        if (!coordinate) {
            continue;
        }

        const rowId = row.id?.trim();
        features.push({
            type: "Feature",
            id: rowId || crypto.randomUUID(),
            geometry: {
                type: "Point",
                coordinates: coordinate,
            },
            properties: { ...row },
        });
    }

    if (features.length === 0) {
        throw new Error("没有符合 WGS84 / EPSG:4326 范围的有效坐标行。");
    }

    const layer: WorkspaceVectorLayer = {
        id: crypto.randomUUID(),
        name: options.name.trim() || document.suggestedLayerName,
        sourceType: "geojson",
        geometryKind: "point",
        featureCount: features.length,
        collection: {
            type: "FeatureCollection",
            features,
        },
        style: createDefaultOverlayLayerStyle(options.styleIndex, "point"),
        createdAt: Date.now(),
        origin: {
            type: "csv",
            filename: document.filename,
        },
    };

    return {
        layer,
        validRows: features.length,
        skippedRows: document.totalRows - features.length,
    };
}
