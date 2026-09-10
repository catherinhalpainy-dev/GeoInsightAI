import {
    bbox,
    booleanPointInPolygon,
    centerMean,
    hexGrid,
    point,
    pointOnFeature,
} from "@turf/turf";
import type {
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    Polygon,
    Position as GeoJsonPosition,
} from "geojson";

import { SPATIAL_HEXBIN_COLORS } from "../../constants/spatialStatistics";
import type {
    SpatialHeatmapAnalysis,
    SpatialHexbinAnalysis,
    SpatialHexbinFeatureCollection,
    SpatialHexbinProperties,
    SpatialRepresentativePoint,
    SpatialRepresentativePointCollection,
    SpatialSourceGeometryType,
    SpatialStatisticsFeatureCollection,
    SpatialStatisticsSummary,
    SpatialWeightMode,
} from "../../types/spatialStatistics";
import { createQuantileClasses } from "./symbology";

const MIN_CELL_SIZE_KM = 0.05;
const MAX_CELL_SIZE_KM = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumericProperty(properties: GeoJsonProperties, field: string) {
    if (!isRecord(properties)) {
        return null;
    }

    const value = properties[field];
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : null;
}

function readStringProperty(properties: GeoJsonProperties, field: string) {
    if (!isRecord(properties)) {
        return null;
    }

    const value = properties[field];
    return typeof value === "string" && value.trim() ? value : null;
}

function getSourceFeatureId(
    feature: Feature,
    sourceLayerId: string,
    featureIndex: number,
) {
    const propertyId = readStringProperty(feature.properties, "id");

    if (propertyId) {
        return propertyId;
    }

    if (typeof feature.id === "string" || typeof feature.id === "number") {
        return String(feature.id);
    }

    return `${sourceLayerId}-${featureIndex + 1}`;
}

function isFinitePosition(coordinate: GeoJsonPosition): coordinate is [number, number] {
    return coordinate.length >= 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1]) &&
        coordinate[0] >= -180 && coordinate[0] <= 180 &&
        coordinate[1] >= -90 && coordinate[1] <= 90;
}

function getRepresentativeCoordinates(feature: Feature): [number, number][] {
    if (feature.geometry.type === "Point") {
        return isFinitePosition(feature.geometry.coordinates)
            ? [[feature.geometry.coordinates[0], feature.geometry.coordinates[1]]]
            : [];
    }

    if (feature.geometry.type === "GeometryCollection") {
        return [];
    }

    try {
        const representative = pointOnFeature(feature);
        return isFinitePosition(representative.geometry.coordinates)
            ? [[
                representative.geometry.coordinates[0],
                representative.geometry.coordinates[1],
            ]]
            : [];
    } catch {
        return [];
    }
}

export function supportsAreaWeight(
    collection: SpatialStatisticsFeatureCollection,
) {
    return collection.features.length > 0 && collection.features.every(
        (feature) => readNumericProperty(feature.properties, "areaM2") !== null,
    );
}

export function createRepresentativePoints(
    collection: SpatialStatisticsFeatureCollection,
    options: {
        sourceLayerId: string;
        weightMode: SpatialWeightMode;
    },
): SpatialRepresentativePointCollection {
    if (collection.features.length === 0) {
        throw new Error("所选输入没有可分析的要素。");
    }

    if (options.weightMode === "area" && !supportsAreaWeight(collection)) {
        throw new Error("当前数据不包含完整且有效的 areaM2 面积字段。");
    }

    const features: SpatialRepresentativePoint[] = [];

    collection.features.forEach((feature, featureIndex) => {
        const coordinates = getRepresentativeCoordinates(feature);

        if (coordinates.length === 0) {
            return;
        }

        const featureWeight = options.weightMode === "area"
            ? readNumericProperty(feature.properties, "areaM2")
            : 1;

        if (featureWeight === null || featureWeight <= 0) {
            return;
        }

        const pointWeight = featureWeight;
        const sourceFeatureId = getSourceFeatureId(
            feature,
            options.sourceLayerId,
            featureIndex,
        );
        const landUseType = readStringProperty(feature.properties, "landUseType");
        const areaM2 = readNumericProperty(feature.properties, "areaM2");

        coordinates.forEach((coordinate, coordinateIndex) => {
            features.push(point(coordinate, {
                sourceFeatureId,
                sourceLayerId: options.sourceLayerId,
                sourceGeometryType: feature.geometry.type as SpatialSourceGeometryType,
                weight: pointWeight,
                normalizedWeight: 0,
                ...(landUseType ? { landUseType } : {}),
                ...(areaM2 !== null ? { areaM2 } : {}),
            }, {
                id: `${sourceFeatureId}-${coordinateIndex + 1}`,
            }));
        });
    });

    if (features.length === 0) {
        throw new Error("输入中没有可生成代表点的有效 Geometry。");
    }

    const maxWeight = Math.max(...features.map((feature) => feature.properties.weight));

    return {
        type: "FeatureCollection",
        features: features.map((feature) => ({
            ...feature,
            properties: {
                ...feature.properties,
                normalizedWeight: maxWeight > 0
                    ? feature.properties.weight / maxWeight
                    : 0,
            },
        })),
    };
}

function calculateMeanCenter(
    points: SpatialRepresentativePointCollection,
): [number, number] | null {
    try {
        const result = centerMean(points, { weight: "weight" });
        const coordinate = result.geometry.coordinates;

        return isFinitePosition(coordinate)
            ? [coordinate[0], coordinate[1]]
            : null;
    } catch {
        return null;
    }
}

function createBaseSummary(
    inputFeatureCount: number,
    points: SpatialRepresentativePointCollection,
    method: SpatialStatisticsSummary["method"],
    weightMode: SpatialWeightMode,
): SpatialStatisticsSummary {
    return {
        method,
        weightMode,
        inputFeatureCount,
        analysisPointCount: points.features.length,
        totalWeight: points.features.reduce(
            (sum, feature) => sum + feature.properties.weight,
            0,
        ),
        meanCenter: calculateMeanCenter(points),
        occupiedCellCount: 0,
        maxCellValue: 0,
        maxCellShare: 0,
        hotspotCells: [],
    };
}

export function createHeatmapAnalysis(
    collection: SpatialStatisticsFeatureCollection,
    options: {
        sourceLayerId: string;
        weightMode: SpatialWeightMode;
    },
): SpatialHeatmapAnalysis {
    const points = createRepresentativePoints(collection, options);

    return {
        points,
        summary: createBaseSummary(
            collection.features.length,
            points,
            "heatmap",
            options.weightMode,
        ),
    };
}

function getExpandedBbox(
    points: SpatialRepresentativePointCollection,
    cellSizeKm: number,
): [number, number, number, number] {
    const extent = bbox(points);
    const latitudePadding = cellSizeKm / 110.574;
    const latitude = (extent[1] + extent[3]) / 2;
    const longitudeScale = Math.max(
        0.1,
        Math.cos(latitude * Math.PI / 180),
    );
    const longitudePadding = cellSizeKm / (111.320 * longitudeScale);

    return [
        extent[0] - longitudePadding,
        extent[1] - latitudePadding,
        extent[2] + longitudePadding,
        extent[3] + latitudePadding,
    ];
}

function findClassIndex(
    value: number,
    classes: ReturnType<typeof createQuantileClasses>,
) {
    const classIndex = classes.findIndex((item, index) =>
        value >= item.min &&
        (index === classes.length - 1 ? value <= item.max : value < item.max),
    );
    const matchedClass = classes[
        classIndex < 0 ? Math.max(0, classes.length - 1) : classIndex
    ];
    const colorIndex = SPATIAL_HEXBIN_COLORS.findIndex(
        (color) => color === matchedClass?.color,
    );

    return colorIndex < 0 ? 0 : colorIndex;
}

export function createHexbinAnalysis(
    collection: SpatialStatisticsFeatureCollection,
    options: {
        sourceLayerId: string;
        weightMode: SpatialWeightMode;
        cellSizeKm: number;
    },
): SpatialHexbinAnalysis {
    if (
        !Number.isFinite(options.cellSizeKm) ||
        options.cellSizeKm < MIN_CELL_SIZE_KM ||
        options.cellSizeKm > MAX_CELL_SIZE_KM
    ) {
        throw new Error("网格尺寸必须在 0.05–100 km 之间。");
    }

    const points = createRepresentativePoints(collection, options);
    const totalWeight = points.features.reduce(
        (sum, feature) => sum + feature.properties.weight,
        0,
    );

    if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
        throw new Error("分析权重为空或全部为零。");
    }

    let grid: FeatureCollection<Polygon, GeoJsonProperties>;

    try {
        grid = hexGrid(
            getExpandedBbox(points, options.cellSizeKm),
            options.cellSizeKm,
            { units: "kilometers" },
        );
    } catch {
        throw new Error("无法生成六边形网格，请调整网格尺寸后重试。");
    }

    const aggregations = grid.features.map(() => ({
        featureCount: 0,
        value: 0,
    }));

    for (const representativePoint of points.features) {
        const cellIndex = grid.features.findIndex((cell) =>
            booleanPointInPolygon(representativePoint, cell),
        );

        if (cellIndex >= 0) {
            aggregations[cellIndex].featureCount += 1;
            aggregations[cellIndex].value += representativePoint.properties.weight;
        }
    }

    const occupied = grid.features.flatMap((feature, index) => {
        const aggregation = aggregations[index];
        return aggregation.featureCount > 0
            ? [{ feature, gridIndex: index, ...aggregation }]
            : [];
    });

    if (occupied.length === 0) {
        throw new Error("代表点未落入生成的六边形网格，请调整网格尺寸后重试。");
    }

    const assignedPointCount = occupied.reduce(
        (sum, item) => sum + item.featureCount,
        0,
    );

    if (assignedPointCount !== points.features.length) {
        throw new Error("部分代表点未能归属网格，请调整网格尺寸后重试。");
    }

    const ranked = [...occupied].sort((first, second) =>
        second.value - first.value || first.gridIndex - second.gridIndex,
    );
    const rankByGridIndex = new Map(
        ranked.map((item, index) => [item.gridIndex, index + 1]),
    );
    const classes = createQuantileClasses(
        occupied.map((item) => item.value),
        5,
        SPATIAL_HEXBIN_COLORS,
    );
    const outputFeatures = occupied.map((item) => {
        const id = `hex-${item.gridIndex + 1}`;
        const properties: SpatialHexbinProperties = {
            analysisOperation: "spatial-hexbin",
            id,
            featureCount: item.featureCount,
            value: item.value,
            share: item.value / totalWeight,
            rank: rankByGridIndex.get(item.gridIndex) ?? occupied.length,
            classIndex: findClassIndex(item.value, classes),
        };

        return {
            ...item.feature,
            id,
            properties,
        };
    });
    const resultCollection: SpatialHexbinFeatureCollection = {
        type: "FeatureCollection",
        features: outputFeatures,
    };
    const hotspotCells = [...outputFeatures]
        .sort((first, second) => first.properties.rank - second.properties.rank)
        .slice(0, 5)
        .map((feature) => ({
            id: feature.properties.id,
            featureCount: feature.properties.featureCount,
            value: feature.properties.value,
            share: feature.properties.share,
            rank: feature.properties.rank,
        }));
    const baseSummary = createBaseSummary(
        collection.features.length,
        points,
        "hexbin",
        options.weightMode,
    );

    return {
        points,
        collection: resultCollection,
        summary: {
            ...baseSummary,
            occupiedCellCount: outputFeatures.length,
            maxCellValue: hotspotCells[0]?.value ?? 0,
            maxCellShare: hotspotCells[0]?.share ?? 0,
            hotspotCells,
        },
    };
}
