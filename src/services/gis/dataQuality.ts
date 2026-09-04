import {
    area,
    kinks,
} from "@turf/turf";
import type {
    Feature,
    GeoJsonProperties,
    Geometry,
    MultiPolygon,
    Polygon,
    Position,
} from "geojson";

import {
    LAND_USE_TYPES,
} from "../../constants/landUse";
import type {
    CleanedDatasetResult,
    DataQualityFeatureCollection,
    DataQualityIssue,
    DataQualityMapFeatureCollection,
    DataQualityReport,
    DataQualityScanOptions,
} from "../../types/dataQuality";

const SUPPORTED_GEOMETRY_TYPES = new Set([
    "Point",
    "MultiPoint",
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon",
]);

const DEFAULT_AREA_MISMATCH_THRESHOLD = 0.1;

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === "object" &&
        value !== null &&
        !Array.isArray(value);
}

function isFeatureCollection(
    value: unknown,
): value is DataQualityFeatureCollection {
    return isRecord(value) &&
        value.type === "FeatureCollection" &&
        Array.isArray(value.features);
}

function normalizeFeatureId(
    value: unknown,
): string | null {
    if (
        typeof value !== "string" &&
        typeof value !== "number"
    ) {
        return null;
    }

    const normalized = String(value).trim();

    return normalized === ""
        ? null
        : normalized;
}

function getFeatureId(
    feature: unknown,
    targetKind: DataQualityScanOptions["targetKind"],
): string | null {
    if (!isRecord(feature)) {
        return null;
    }

    const properties = isRecord(feature.properties)
        ? feature.properties
        : null;
    const primaryId = properties?.id;

    if (targetKind === "primary") {
        return normalizeFeatureId(primaryId);
    }

    return normalizeFeatureId(feature.id) ??
        normalizeFeatureId(primaryId);
}

function isValidPosition(
    value: unknown,
): value is Position {
    if (
        !Array.isArray(value) ||
        value.length < 2 ||
        !value.every(
            (coordinate) =>
                typeof coordinate === "number" &&
                Number.isFinite(coordinate),
        )
    ) {
        return false;
    }

    const [longitude, latitude] = value;

    return longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90;
}

function isPositionSequence(
    value: unknown,
    minimumLength: number,
): value is Position[] {
    return Array.isArray(value) &&
        value.length >= minimumLength &&
        value.every(isValidPosition);
}

function hasValidCoordinateStructure(
    geometry: Record<string, unknown>,
): boolean {
    const coordinates = geometry.coordinates;

    switch (geometry.type) {
        case "Point":
            return isValidPosition(coordinates);

        case "MultiPoint":
            return Array.isArray(coordinates) &&
                coordinates.length > 0 &&
                coordinates.every(isValidPosition);

        case "LineString":
            return isPositionSequence(coordinates, 2);

        case "MultiLineString":
            return Array.isArray(coordinates) &&
                coordinates.length > 0 &&
                coordinates.every(
                    (line) => isPositionSequence(line, 2),
                );

        case "Polygon":
            return Array.isArray(coordinates) &&
                coordinates.length > 0 &&
                coordinates.every(
                    (ring) =>
                        Array.isArray(ring) &&
                        ring.every(isValidPosition),
                );

        case "MultiPolygon":
            return Array.isArray(coordinates) &&
                coordinates.length > 0 &&
                coordinates.every(
                    (polygon) =>
                        Array.isArray(polygon) &&
                        polygon.length > 0 &&
                        polygon.every(
                            (ring) =>
                                Array.isArray(ring) &&
                                ring.every(isValidPosition),
                        ),
                );

        default:
            return false;
    }
}

function positionsEqual(
    first: Position,
    last: Position,
) {
    return first[0] === last[0] &&
        first[1] === last[1];
}

interface RingProblem {
    path: string;
    fixable: boolean;
}

function inspectRing(
    value: unknown,
    path: string,
): RingProblem | null {
    if (!Array.isArray(value)) {
        return {
            path,
            fixable: false,
        };
    }

    if (!value.every(isValidPosition)) {
        return null;
    }

    if (value.length < 3) {
        return {
            path,
            fixable: false,
        };
    }

    const first = value[0];
    const last = value[value.length - 1];

    if (!positionsEqual(first, last)) {
        return {
            path,
            fixable: true,
        };
    }

    return value.length < 4
        ? {
            path,
            fixable: false,
        }
        : null;
}

function inspectPolygonRings(
    geometry: Record<string, unknown>,
): RingProblem[] {
    const coordinates = geometry.coordinates;

    if (!Array.isArray(coordinates)) {
        return [];
    }

    if (geometry.type === "Polygon") {
        return coordinates.flatMap((ring, ringIndex) => {
            const issue = inspectRing(
                ring,
                `ring ${ringIndex + 1}`,
            );

            return issue ? [issue] : [];
        });
    }

    if (geometry.type === "MultiPolygon") {
        return coordinates.flatMap((polygon, polygonIndex) => {
            if (!Array.isArray(polygon)) {
                return [];
            }

            return polygon.flatMap((ring, ringIndex) => {
                const issue = inspectRing(
                    ring,
                    `part ${polygonIndex + 1}, ring ${ringIndex + 1}`,
                );

                return issue ? [issue] : [];
            });
        });
    }

    return [];
}

function normalizePolygonRing(
    ring: unknown,
): Position[] | null {
    if (!isPositionSequence(ring, 3)) {
        return null;
    }

    const normalizedRing = ring.map(
        (position) => [...position],
    );

    if (!positionsEqual(
        normalizedRing[0],
        normalizedRing[normalizedRing.length - 1],
    )) {
        normalizedRing.push([...normalizedRing[0]]);
    }

    return normalizedRing.length >= 4
        ? normalizedRing
        : null;
}

function toPolygonGeometry(
    geometry: Record<string, unknown>,
): Polygon | MultiPolygon | null {
    if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates;

        if (
            Array.isArray(coordinates) &&
            coordinates.length > 0
        ) {
            const normalizedRings = coordinates.map(
                normalizePolygonRing,
            );

            if (normalizedRings.some((ring) => ring === null)) {
                return null;
            }

            return {
                type: "Polygon",
                coordinates: normalizedRings.filter(
                    (ring): ring is Position[] => ring !== null,
                ),
            };
        }
    }

    if (geometry.type === "MultiPolygon") {
        const coordinates = geometry.coordinates;

        if (
            Array.isArray(coordinates) &&
            coordinates.length > 0
        ) {
            const normalizedPolygons = coordinates.map((polygon) => {
                if (!Array.isArray(polygon) || polygon.length === 0) {
                    return null;
                }

                const normalizedRings = polygon.map(
                    normalizePolygonRing,
                );

                return normalizedRings.some((ring) => ring === null)
                    ? null
                    : normalizedRings.filter(
                        (ring): ring is Position[] => ring !== null,
                    );
            });

            if (normalizedPolygons.some((polygon) => polygon === null)) {
                return null;
            }

            return {
                type: "MultiPolygon",
                coordinates: normalizedPolygons.filter(
                    (polygon): polygon is Position[][] => polygon !== null,
                ),
            };
        }
    }

    return null;
}

function hasSelfIntersection(
    geometry: Polygon | MultiPolygon,
): boolean {
    try {
        return kinks(geometry).features.length > 0;
    } catch {
        return false;
    }
}

function calculatePolygonArea(
    geometry: Polygon | MultiPolygon,
): number | null {
    try {
        const calculatedArea = area({
            type: "Feature",
            properties: {},
            geometry,
        });

        return Number.isFinite(calculatedArea) &&
            calculatedArea > 0
            ? calculatedArea
            : null;
    } catch {
        return null;
    }
}

function formatArea(
    value: number,
) {
    return new Intl.NumberFormat("zh-CN", {
        maximumFractionDigits: 0,
    }).format(value);
}

function addPrimaryAttributeIssues(
    feature: Record<string, unknown>,
    context: {
        featureIndex: number;
        featureId: string | null;
        locatable: boolean;
        geometryAreaM2: number | null;
        geometryIsSafe: boolean;
        areaMismatchThreshold: number;
        addIssue: (
            issue: Omit<DataQualityIssue, "id">,
        ) => void;
    },
) {
    const properties = isRecord(feature.properties)
        ? feature.properties
        : null;
    const common = {
        category: "attributes" as const,
        featureId: context.featureId,
        featureIndex: context.featureIndex,
        locatable: context.locatable,
    };

    if (!properties) {
        context.addIssue({
            ...common,
            code: "missing_required_attribute",
            severity: "error",
            message: "Feature 缺少土地利用属性对象。",
            fixable: false,
        });
        return;
    }

    const landUseType = properties.landUseType;

    if (landUseType === undefined || landUseType === null || landUseType === "") {
        context.addIssue({
            ...common,
            code: "missing_required_attribute",
            severity: "error",
            message: "缺少必填属性 landUseType。",
            fixable: false,
        });
    } else if (
        typeof landUseType !== "string" ||
        !LAND_USE_TYPES.includes(
            landUseType as typeof LAND_USE_TYPES[number],
        )
    ) {
        context.addIssue({
            ...common,
            code: "invalid_attribute_value",
            severity: "error",
            message: "landUseType 不属于支持的土地利用类型。",
            fixable: false,
        });
    }

    const districtCode = properties.districtCode;

    if (districtCode === undefined || districtCode === null || districtCode === "") {
        context.addIssue({
            ...common,
            code: "missing_required_attribute",
            severity: "error",
            message: "缺少必填属性 districtCode。",
            fixable: false,
        });
    } else if (typeof districtCode !== "string") {
        context.addIssue({
            ...common,
            code: "invalid_attribute_value",
            severity: "error",
            message: "districtCode 必须是字符串。",
            fixable: false,
        });
    }

    const builtYear = properties.builtYear;

    if (builtYear === undefined) {
        context.addIssue({
            ...common,
            code: "missing_required_attribute",
            severity: "error",
            message: "缺少必填属性 builtYear；该字段允许为 null。",
            fixable: false,
        });
    } else if (
        builtYear !== null &&
        (
            typeof builtYear !== "number" ||
            !Number.isFinite(builtYear) ||
            !Number.isInteger(builtYear)
        )
    ) {
        context.addIssue({
            ...common,
            code: "invalid_attribute_value",
            severity: "error",
            message: "builtYear 必须是整数或 null。",
            fixable: false,
        });
    }

    const areaM2 = properties.areaM2;
    const validArea = typeof areaM2 === "number" &&
        Number.isFinite(areaM2) &&
        areaM2 > 0;

    if (!validArea) {
        const canRecalculate =
            context.geometryIsSafe &&
            context.geometryAreaM2 !== null;

        context.addIssue({
            ...common,
            code: "invalid_area",
            severity: "error",
            message: "areaM2 缺失或不是大于 0 的有限数值。",
            fixable: canRecalculate,
            fixType: canRecalculate
                ? "recalculate_missing_area"
                : undefined,
        });
    } else if (context.geometryIsSafe && context.geometryAreaM2 !== null) {
        const relativeDifference = Math.abs(
            areaM2 - context.geometryAreaM2,
        ) / context.geometryAreaM2;

        if (relativeDifference > context.areaMismatchThreshold) {
            context.addIssue({
                ...common,
                code: "area_mismatch",
                severity: "warning",
                message: [
                    `属性面积 ${formatArea(areaM2)} m²`,
                    `几何面积 ${formatArea(context.geometryAreaM2)} m²`,
                    `差异 ${(relativeDifference * 100).toFixed(1)}%`,
                ].join("；"),
                fixable: false,
            });
        }
    }
}

export function scanFeatureCollection(
    collection: unknown,
    options: DataQualityScanOptions,
): DataQualityReport {
    if (!isFeatureCollection(collection)) {
        throw new Error(
            "无法完成数据质量检查：当前数据不是有效的 FeatureCollection。",
        );
    }

    const issues: DataQualityIssue[] = [];
    const locatableFeatureIndexes = new Set<number>();
    let issueSequence = 0;
    const addIssue = (
        issue: Omit<DataQualityIssue, "id">,
    ) => {
        issueSequence += 1;
        issues.push({
            ...issue,
            id: `${options.targetId}:${issue.featureIndex}:${issue.code}:${issueSequence}`,
        });
    };
    const idIndexes = new Map<string, number[]>();

    collection.features.forEach((feature, featureIndex) => {
        const featureId = getFeatureId(
            feature,
            options.targetKind,
        );

        if (!featureId) {
            return;
        }

        const indexes = idIndexes.get(featureId) ?? [];
        idIndexes.set(featureId, [...indexes, featureIndex]);
    });

    const duplicateIndexes = new Set<number>();

    for (const indexes of idIndexes.values()) {
        if (indexes.length > 1) {
            indexes.forEach((index) => duplicateIndexes.add(index));
        }
    }

    const threshold =
        typeof options.areaMismatchThreshold === "number" &&
        Number.isFinite(options.areaMismatchThreshold) &&
        options.areaMismatchThreshold > 0
            ? options.areaMismatchThreshold
            : DEFAULT_AREA_MISMATCH_THRESHOLD;

    collection.features.forEach((feature, featureIndex) => {
        const featureId = getFeatureId(
            feature,
            options.targetKind,
        );

        if (!isRecord(feature) || feature.type !== "Feature") {
            addIssue({
                code: "invalid_feature_structure",
                category: "structure",
                severity: "error",
                featureId,
                featureIndex,
                message: "要素不是有效的 GeoJSON Feature。",
                fixable: false,
                locatable: false,
            });
            return;
        }

        if (!featureId) {
            addIssue({
                code: "missing_feature_id",
                category: "id",
                severity: "error",
                featureId: null,
                featureIndex,
                message: "Feature 缺少可用的业务 ID。",
                fixable: true,
                fixType: "generate_missing_id",
                locatable: false,
            });
        } else if (duplicateIndexes.has(featureIndex)) {
            addIssue({
                code: "duplicate_feature_id",
                category: "id",
                severity: "error",
                featureId,
                featureIndex,
                message: `Feature ID “${featureId}” 在当前图层中重复。`,
                fixable: false,
                locatable: false,
            });
        }

        const geometry = feature.geometry;

        if (geometry === null || geometry === undefined) {
            addIssue({
                code: "missing_geometry",
                category: "geometry",
                severity: "error",
                featureId,
                featureIndex,
                message: "Feature 缺少 Geometry。",
                fixable: false,
                locatable: false,
            });

            if (options.targetKind === "primary") {
                addPrimaryAttributeIssues(feature, {
                    featureIndex,
                    featureId,
                    locatable: false,
                    geometryAreaM2: null,
                    geometryIsSafe: false,
                    areaMismatchThreshold: threshold,
                    addIssue,
                });
            }
            return;
        }

        if (
            !isRecord(geometry) ||
            typeof geometry.type !== "string" ||
            !SUPPORTED_GEOMETRY_TYPES.has(geometry.type)
        ) {
            addIssue({
                code: "unsupported_geometry",
                category: "geometry",
                severity: "warning",
                featureId,
                featureIndex,
                message: "当前工作台不支持该 Geometry 类型。",
                fixable: false,
                locatable: false,
            });
            return;
        }

        const coordinatesValid =
            hasValidCoordinateStructure(geometry);
        const ringProblems = coordinatesValid &&
            (
                geometry.type === "Polygon" ||
                geometry.type === "MultiPolygon"
            )
                ? inspectPolygonRings(geometry)
                : [];
        const locatable = coordinatesValid &&
            ringProblems.every((problem) => problem.fixable);

        if (locatable) {
            locatableFeatureIndexes.add(featureIndex);
        }

        if (!coordinatesValid) {
            addIssue({
                code: "invalid_coordinate",
                category: "geometry",
                severity: "error",
                featureId,
                featureIndex,
                message: "Geometry 包含非有限、越界或结构错误的 EPSG:4326 坐标。",
                fixable: false,
                locatable: false,
            });
        }

        for (const problem of ringProblems) {
            addIssue({
                code: "invalid_polygon_ring",
                category: "geometry",
                severity: "error",
                featureId,
                featureIndex,
                message: problem.fixable
                    ? `Polygon ${problem.path} 未闭合。`
                    : `Polygon ${problem.path} 不足以形成合法 LinearRing。`,
                fixable: problem.fixable,
                fixType: problem.fixable
                    ? "close_polygon_ring"
                    : undefined,
                locatable,
            });
        }

        const polygonGeometry =
            coordinatesValid &&
                ringProblems.every((problem) => problem.fixable)
                ? toPolygonGeometry(geometry)
                : null;
        const selfIntersection = polygonGeometry
            ? hasSelfIntersection(polygonGeometry)
            : false;

        if (selfIntersection) {
            addIssue({
                code: "self_intersection",
                category: "geometry",
                severity: "error",
                featureId,
                featureIndex,
                message: "Polygon 存在自相交，需要人工检查或专业拓扑修复。",
                fixable: false,
                locatable: true,
            });
        }

        if (options.targetKind === "primary") {
            const geometryAreaM2 = polygonGeometry &&
                !selfIntersection
                ? calculatePolygonArea(polygonGeometry)
                : null;

            addPrimaryAttributeIssues(feature, {
                featureIndex,
                featureId,
                locatable,
                geometryAreaM2,
                geometryIsSafe:
                    polygonGeometry !== null &&
                    !selfIntersection,
                areaMismatchThreshold: threshold,
                addIssue,
            });
        }
    });

    const normalizedIssues = issues.map((issue) => ({
        ...issue,
        locatable: issue.locatable ||
            locatableFeatureIndexes.has(issue.featureIndex),
    }));
    const errorCount = normalizedIssues.filter(
        (issue) => issue.severity === "error",
    ).length;
    const warningCount = normalizedIssues.filter(
        (issue) => issue.severity === "warning",
    ).length;
    const featureIndexesWithErrors = new Set(
        normalizedIssues
            .filter((issue) => issue.severity === "error")
            .map((issue) => issue.featureIndex),
    );
    const totalFeatures = collection.features.length;
    const passedFeatures = Math.max(
        0,
        totalFeatures - featureIndexesWithErrors.size,
    );

    return {
        targetId: options.targetId,
        targetName: options.targetName,
        targetKind: options.targetKind,
        totalFeatures,
        passedFeatures,
        errorCount,
        warningCount,
        issueCount: normalizedIssues.length,
        passRate: totalFeatures === 0
            ? 0
            : passedFeatures / totalFeatures,
        issues: normalizedIssues,
        scannedAt: Date.now(),
    };
}

function closeRing(
    ring: Position[],
): boolean {
    if (
        ring.length < 3 ||
        !ring.every(isValidPosition) ||
        positionsEqual(ring[0], ring[ring.length - 1])
    ) {
        return false;
    }

    ring.push([...ring[0]]);
    return true;
}

function closePolygonRings(
    geometry: Geometry | null,
): number {
    if (!geometry) {
        return 0;
    }

    if (geometry.type === "Polygon") {
        return geometry.coordinates.reduce(
            (count, ring) => count + Number(closeRing(ring)),
            0,
        );
    }

    if (geometry.type === "MultiPolygon") {
        return geometry.coordinates.reduce(
            (count, polygon) =>
                count + polygon.reduce(
                    (ringCount, ring) =>
                        ringCount + Number(closeRing(ring)),
                    0,
                ),
            0,
        );
    }

    return 0;
}

function setGeneratedId(
    feature: Feature<Geometry | null, GeoJsonProperties>,
    targetKind: DataQualityScanOptions["targetKind"],
) {
    const generatedId = crypto.randomUUID();

    if (targetKind === "overlay") {
        feature.id = generatedId;
        return;
    }

    const properties = isRecord(feature.properties)
        ? feature.properties
        : {};

    feature.properties = {
        ...properties,
        id: generatedId,
    };
}

function recalculateArea(
    feature: Feature<Geometry | null, GeoJsonProperties>,
): boolean {
    if (
        !feature.geometry ||
        (
            feature.geometry.type !== "Polygon" &&
            feature.geometry.type !== "MultiPolygon"
        )
    ) {
        return false;
    }

    const calculatedArea = calculatePolygonArea(
        feature.geometry,
    );

    if (calculatedArea === null) {
        return false;
    }

    const properties = isRecord(feature.properties)
        ? feature.properties
        : {};

    feature.properties = {
        ...properties,
        areaM2: calculatedArea,
    };
    return true;
}

export function createCleanedDataset(
    collection: DataQualityFeatureCollection,
    report: DataQualityReport,
): CleanedDatasetResult {
    const clonedCollection = structuredClone(collection);
    const issuesByFeature = new Map<number, DataQualityIssue[]>();

    for (const issue of report.issues) {
        const featureIssues = issuesByFeature.get(
            issue.featureIndex,
        ) ?? [];
        issuesByFeature.set(
            issue.featureIndex,
            [...featureIssues, issue],
        );
    }

    let appliedFixCount = 0;

    clonedCollection.features.forEach((feature, featureIndex) => {
        const featureIssues = issuesByFeature.get(featureIndex) ?? [];

        if (
            featureIssues.some(
                (issue) => issue.fixType === "generate_missing_id",
            )
        ) {
            setGeneratedId(feature, report.targetKind);
            appliedFixCount += 1;
        }

        if (
            featureIssues.some(
                (issue) => issue.fixType === "close_polygon_ring",
            )
        ) {
            appliedFixCount += closePolygonRings(feature.geometry);
        }

        if (
            report.targetKind === "primary" &&
            featureIssues.some(
                (issue) => issue.fixType === "recalculate_missing_area",
            ) &&
            recalculateArea(feature)
        ) {
            appliedFixCount += 1;
        }
    });

    return {
        targetId: report.targetId,
        targetName: `${report.targetName}-cleaned`,
        targetKind: report.targetKind,
        collection: clonedCollection,
        appliedFixCount,
        unresolvedIssueCount: Math.max(
            0,
            report.issueCount - appliedFixCount,
        ),
    };
}

function cloneRenderableGeometry(
    geometry: Geometry | null,
): Geometry | null {
    if (
        !geometry ||
        geometry.type === "GeometryCollection" ||
        !SUPPORTED_GEOMETRY_TYPES.has(geometry.type)
    ) {
        return null;
    }

    const geometryRecord = geometry as unknown;

    if (
        !isRecord(geometryRecord) ||
        !hasValidCoordinateStructure(geometryRecord)
    ) {
        return null;
    }

    const clonedGeometry = structuredClone(geometry);

    if (
        clonedGeometry.type === "Polygon" ||
        clonedGeometry.type === "MultiPolygon"
    ) {
        closePolygonRings(clonedGeometry);
        const record = clonedGeometry as unknown;

        if (
            !isRecord(record) ||
            inspectPolygonRings(record).length > 0
        ) {
            return null;
        }
    }

    return clonedGeometry;
}

export function createDataQualityMapCollection(
    collection: DataQualityFeatureCollection,
    report: DataQualityReport,
): DataQualityMapFeatureCollection {
    const features = report.issues.flatMap((issue) => {
        if (!issue.locatable) {
            return [];
        }

        const sourceFeature = collection.features[
            issue.featureIndex
        ];
        const geometry = cloneRenderableGeometry(
            sourceFeature?.geometry ?? null,
        );

        if (!geometry) {
            return [];
        }

        return [{
            type: "Feature" as const,
            geometry,
            properties: {
                issueId: issue.id,
                severity: issue.severity,
                featureIndex: issue.featureIndex,
                featureId: issue.featureId,
                code: issue.code,
            },
        }];
    });

    return {
        type: "FeatureCollection",
        features,
    };
}
