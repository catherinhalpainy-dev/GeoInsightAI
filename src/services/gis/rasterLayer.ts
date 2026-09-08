import type {
    WmsRasterSource,
    WorkspaceRasterLayer,
    XYZRasterSource,
} from "../../types/mapLayer";
import { parsePublicHttpUrl } from "../import/remoteGeoJson";
import { buildWmsTileUrl } from "./wms";

export interface CreateXyzRasterLayerInput {
    name: string;
    urlTemplate: string;
    attribution?: string;
    minZoom?: number;
    maxZoom?: number;
    tileSize: 256 | 512;
}

export interface CreateWmsRasterLayerInput {
    name: string;
    attribution?: string;
    source: WmsRasterSource;
}

function normalizeName(name: string) {
    const normalized = name.trim();

    if (!normalized) {
        throw new Error("请输入数据源名称。");
    }

    return normalized;
}

export function validateXyzTileTemplate(rawTemplate: string) {
    const url = parsePublicHttpUrl(rawTemplate);
    const template = url.toString();

    for (const token of ["{z}", "{x}", "{y}"]) {
        if (!rawTemplate.includes(token)) {
            throw new Error(`XYZ URL Template 缺少 ${token}。`);
        }
    }

    return template
        .replace(/%7Bz%7D/gi, "{z}")
        .replace(/%7Bx%7D/gi, "{x}")
        .replace(/%7By%7D/gi, "{y}");
}

function validateZoomRange(minZoom?: number, maxZoom?: number) {
    if (minZoom !== undefined && (!Number.isFinite(minZoom) || minZoom < 0 || minZoom > 24)) {
        throw new Error("Min Zoom 必须在 0 到 24 之间。");
    }

    if (maxZoom !== undefined && (!Number.isFinite(maxZoom) || maxZoom < 0 || maxZoom > 24)) {
        throw new Error("Max Zoom 必须在 0 到 24 之间。");
    }

    if (minZoom !== undefined && maxZoom !== undefined && minZoom > maxZoom) {
        throw new Error("Min Zoom 不能大于 Max Zoom。");
    }
}

export function createXyzRasterLayer(
    input: CreateXyzRasterLayerInput,
): WorkspaceRasterLayer {
    validateZoomRange(input.minZoom, input.maxZoom);
    const source: XYZRasterSource = {
        type: "xyz",
        tiles: [validateXyzTileTemplate(input.urlTemplate)],
        tileSize: input.tileSize,
    };

    return {
        id: crypto.randomUUID(),
        name: normalizeName(input.name),
        sourceType: "xyz",
        visible: true,
        opacity: 1,
        createdAt: Date.now(),
        attribution: input.attribution?.trim() || undefined,
        minZoom: input.minZoom,
        maxZoom: input.maxZoom,
        source,
    };
}

export function createWmsRasterLayer(
    input: CreateWmsRasterLayerInput,
): WorkspaceRasterLayer {
    buildWmsTileUrl(input.source);

    if (!input.source.layerName.trim()) {
        throw new Error("请输入 WMS Layer Name。");
    }

    return {
        id: crypto.randomUUID(),
        name: normalizeName(input.name),
        sourceType: "wms",
        visible: true,
        opacity: 1,
        createdAt: Date.now(),
        attribution: input.attribution?.trim() || undefined,
        source: {
            ...input.source,
            baseUrl: parsePublicHttpUrl(input.source.baseUrl).toString(),
            layerName: input.source.layerName.trim(),
            styleName: input.source.styleName.trim(),
        },
    };
}
