import {
    LAND_USE_LABELS,
} from "../../constants/landUse";
import {
    WORKSPACE_COMMANDS,
} from "../../constants/workspaceCommands";
import type {
    AnalysisResultLayer,
} from "../../types/analysis";
import type {
    LandUseDataset,
} from "../../types/landUse";
import type {
    WorkspaceVectorLayer,
    WorkspaceRasterLayer,
} from "../../types/mapLayer";
import type {
    IndexedWorkspaceSearchResult,
    WorkspaceSearchDocument,
} from "../../types/search";

const MAX_PRIMITIVE_PROPERTIES = 32;

export function normalizeSearchText(value: string) {
    return value.trim().toLocaleLowerCase();
}

function createDocument(
    result: IndexedWorkspaceSearchResult,
    searchValues: readonly (string | number | boolean | null | undefined)[],
    priority: number,
    order: number,
): WorkspaceSearchDocument {
    return {
        result,
        normalizedTitle: normalizeSearchText(result.title),
        searchText: normalizeSearchText(
            searchValues
                .filter((value) => value !== null && value !== undefined)
                .map(String)
                .join(" "),
        ),
        priority,
        order,
    };
}

function getPrimitivePropertyEntries(
    properties: unknown,
) {
    if (
        typeof properties !== "object" ||
        properties === null ||
        Array.isArray(properties)
    ) {
        return [];
    }

    try {
        return Object.entries(properties)
            .filter((entry): entry is [string, string | number | boolean] => {
                const valueType = typeof entry[1];
                return valueType === "string" ||
                    valueType === "number" ||
                    valueType === "boolean";
            })
            .slice(0, MAX_PRIMITIVE_PROPERTIES);
    } catch {
        return [];
    }
}

function findFeatureTitle(
    entries: readonly [string, string | number | boolean][],
    fallback: string,
) {
    const preferredKeys = ["name", "title", "id", "code"];

    for (const key of preferredKeys) {
        const entry = entries.find(
            ([propertyName]) => propertyName.toLocaleLowerCase() === key,
        );

        if (entry && String(entry[1]).trim()) {
            return String(entry[1]);
        }
    }

    return fallback;
}

function formatGeometryKind(kind: WorkspaceVectorLayer["geometryKind"]) {
    switch (kind) {
        case "point":
            return "Point";
        case "line":
            return "Line";
        case "polygon":
            return "Polygon";
        case "mixed":
            return "Mixed";
    }
}

export function buildWorkspaceSearchIndex(
    primaryDataset: LandUseDataset | null,
    overlayLayers: readonly WorkspaceVectorLayer[],
    analysisResultLayers: readonly AnalysisResultLayer[],
    rasterLayers: readonly WorkspaceRasterLayer[] = [],
) {
    const documents: WorkspaceSearchDocument[] = [];
    let order = 0;

    if (primaryDataset) {
        documents.push(createDocument(
            {
                type: "layer",
                id: `layer:primary:${primaryDataset.id}`,
                layerType: "primary",
                layerId: primaryDataset.id,
                title: primaryDataset.name,
                subtitle: `Primary · Polygon · ${primaryDataset.collection.features.length.toLocaleString("zh-CN")} features`,
            },
            [primaryDataset.name, "primary", "土地利用", "主数据"],
            1,
            order++,
        ));

        primaryDataset.collection.features.forEach((feature, featureIndex) => {
            const properties = feature.properties;
            const landUseLabel = LAND_USE_LABELS[properties.landUseType] ??
                String(properties.landUseType);
            const areaLabel = typeof properties.areaM2 === "number" &&
                Number.isFinite(properties.areaM2)
                ? `${properties.areaM2.toLocaleString("zh-CN")} m²`
                : "面积未知";

            documents.push(createDocument(
                {
                    type: "feature",
                    id: `feature:primary:${primaryDataset.id}:${featureIndex}`,
                    title: properties.id,
                    subtitle: `${landUseLabel} · ${areaLabel}`,
                    sourceType: "primary",
                    layerId: primaryDataset.id,
                    featureId: properties.id,
                    featureIndex,
                },
                [
                    properties.id,
                    properties.landUseType,
                    landUseLabel,
                    properties.districtCode,
                    properties.builtYear,
                ],
                0,
                order++,
            ));
        });
    }

    for (const layer of overlayLayers) {
        documents.push(createDocument(
            {
                type: "layer",
                id: `layer:overlay:${layer.id}`,
                layerType: "overlay",
                layerId: layer.id,
                title: layer.name,
                subtitle: `Overlay · ${formatGeometryKind(layer.geometryKind)} · ${layer.featureCount.toLocaleString("zh-CN")} features`,
            },
            [layer.name, "overlay", formatGeometryKind(layer.geometryKind)],
            1,
            order++,
        ));

        layer.collection.features.forEach((feature, featureIndex) => {
            const entries = getPrimitivePropertyEntries(feature.properties);
            const title = findFeatureTitle(
                entries,
                `${layer.name} · #${featureIndex + 1}`,
            );

            documents.push(createDocument(
                {
                    type: "feature",
                    id: `feature:overlay:${layer.id}:${featureIndex}`,
                    title,
                    subtitle: `${layer.name} · Overlay feature`,
                    sourceType: "overlay",
                    layerId: layer.id,
                    featureId: feature.id === undefined
                        ? undefined
                        : String(feature.id),
                    featureIndex,
                },
                [
                    layer.name,
                    title,
                    ...entries.flatMap(([key, value]) => [key, value]),
                ],
                3,
                order++,
            ));
        });
    }

    for (const layer of analysisResultLayers) {
        documents.push(createDocument(
            {
                type: "layer",
                id: `layer:analysis:${layer.id}`,
                layerType: "analysis",
                layerId: layer.id,
                title: layer.name,
                subtitle: `Analysis · ${layer.geometryType} · ${layer.featureCount.toLocaleString("zh-CN")} features`,
            },
            [layer.name, layer.operation, "analysis", "分析结果"],
            1,
            order++,
        ));

        layer.collection.features.forEach((feature, featureIndex) => {
            const entries = getPrimitivePropertyEntries(feature.properties);
            const title = findFeatureTitle(
                entries,
                `${layer.name} · #${featureIndex + 1}`,
            );

            documents.push(createDocument(
                {
                    type: "feature",
                    id: `feature:analysis:${layer.id}:${featureIndex}`,
                    title,
                    subtitle: `${layer.name} · ${layer.operation}`,
                    sourceType: "analysis",
                    layerId: layer.id,
                    featureId: feature.id === undefined
                        ? undefined
                        : String(feature.id),
                    featureIndex,
                },
                [
                    layer.name,
                    layer.operation,
                    title,
                    ...entries.flatMap(([key, value]) => [key, value]),
                ],
                3,
                order++,
            ));
        });
    }

    for (const layer of rasterLayers) {
        const sourceLabel = layer.source.type === "wms"
            ? `WMS Raster · ${layer.source.layerName}`
            : "XYZ Raster";

        documents.push(createDocument(
            {
                type: "layer",
                id: `layer:raster:${layer.id}`,
                layerType: "raster",
                layerId: layer.id,
                title: layer.name,
                subtitle: sourceLabel,
            },
            [
                layer.name,
                layer.sourceType,
                "raster",
                "地图服务",
                layer.source.type === "wms" ? layer.source.layerName : "xyz tiles",
            ],
            1,
            order++,
        ));
    }

    for (const command of WORKSPACE_COMMANDS) {
        documents.push(createDocument(
            {
                type: "command",
                id: `command:${command.id}`,
                commandId: command.id,
                title: command.label,
                subtitle: command.description,
            },
            [command.label, command.description, ...command.keywords],
            2,
            order++,
        ));
    }

    return documents;
}

function getMatchRank(
    document: WorkspaceSearchDocument,
    query: string,
) {
    if (document.normalizedTitle === query) {
        return 0;
    }

    if (document.normalizedTitle.startsWith(query)) {
        return 1;
    }

    if (document.normalizedTitle.includes(query)) {
        return 2;
    }

    return document.searchText.includes(query) ? 3 : null;
}

export function searchWorkspaceIndex(
    index: readonly WorkspaceSearchDocument[],
    rawQuery: string,
    limit = 40,
) {
    const query = normalizeSearchText(rawQuery);

    if (!query) {
        return [];
    }

    return index
        .flatMap((document) => {
            const rank = getMatchRank(document, query);
            return rank === null ? [] : [{ document, rank }];
        })
        .sort((first, second) =>
            first.rank - second.rank ||
            first.document.priority - second.document.priority ||
            first.document.order - second.document.order,
        )
        .slice(0, limit)
        .map(({ document }) => document.result);
}
