import {
    z,
} from "zod";

import type {
    GeoInsightProject,
} from "../../types/project";
import {
    GEOINSIGHT_PROJECT_FORMAT,
    GEOINSIGHT_PROJECT_VERSION,
} from "../../types/project";

const publicHttpUrlSchema = z.string().refine((value) => {
    try {
        const url = new URL(value);
        const sensitiveNames = new Set([
            "token",
            "access_token",
            "api_key",
            "apikey",
            "key",
            "auth",
            "password",
        ]);
        const hasSensitiveParameter = [...url.searchParams.keys()].some(
            (key) => sensitiveNames.has(key.toLocaleLowerCase()),
        );

        return (url.protocol === "http:" || url.protocol === "https:") &&
            !url.username &&
            !url.password &&
            !hasSensitiveParameter;
    } catch {
        return false;
    }
}, "仅支持不包含私密凭据的 HTTP/HTTPS URL");

const xyzTileTemplateSchema = publicHttpUrlSchema.refine(
    (value) => ["{z}", "{x}", "{y}"].every((token) => value.includes(token)),
    "XYZ URL 必须包含 {z}、{x}、{y}",
);
const landUseTypeSchema = z.enum([
    "residential",
    "commercial",
    "industrial",
    "green",
    "public",
    "transportation",
    "other",
]);

const positionSchema = z.tuple([
    z.number().finite().min(-180).max(180),
    z.number().finite().min(-90).max(90),
]);

const polygonGeometrySchema = z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(
        z.array(positionSchema).min(4),
    ).min(1),
});

const pointGeometrySchema = z.object({
    type: z.literal("Point"),
    coordinates: positionSchema,
});

const multiPointGeometrySchema = z.object({
    type: z.literal("MultiPoint"),
    coordinates: z.array(positionSchema).min(1),
});

const lineStringGeometrySchema = z.object({
    type: z.literal("LineString"),
    coordinates: z.array(positionSchema).min(2),
});

const multiLineStringGeometrySchema = z.object({
    type: z.literal("MultiLineString"),
    coordinates: z.array(
        z.array(positionSchema).min(2),
    ).min(1),
});

const multiPolygonGeometrySchema = z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(
        z.array(
            z.array(positionSchema).min(4),
        ).min(1),
    ).min(1),
});

const overlayGeometrySchema = z.discriminatedUnion("type", [
    pointGeometrySchema,
    multiPointGeometrySchema,
    lineStringGeometrySchema,
    multiLineStringGeometrySchema,
    polygonGeometrySchema,
    multiPolygonGeometrySchema,
]);

const geoJsonPropertiesSchema = z.record(
    z.string(),
    z.unknown(),
).nullable();

const landUsePropertiesSchema = z.object({
    id: z.string().min(1),
    landUseType: landUseTypeSchema,
    areaM2: z.number().finite().positive(),
    districtCode: z.string(),
    builtYear: z.number().finite().int().nullable(),
});

const landUseFeatureSchema = z.object({
    type: z.literal("Feature"),
    geometry: polygonGeometrySchema,
    properties: landUsePropertiesSchema,
});

const landUseCollectionSchema = z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(landUseFeatureSchema),
});

const primaryDatasetSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    sourceCrs: z.literal("EPSG:4326"),
    collection: landUseCollectionSchema,
});

const overlayFeatureSchema = z.object({
    type: z.literal("Feature"),
    id: z.union([z.string(), z.number()]).optional(),
    geometry: overlayGeometrySchema,
    properties: geoJsonPropertiesSchema,
});

const overlayCollectionSchema = z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(overlayFeatureSchema),
});

const overlayStyleSchema = z.object({
    visible: z.boolean(),
    opacity: z.number().finite().min(0).max(1),
    fillColor: z.string().min(1),
    lineColor: z.string().min(1),
    pointColor: z.string().min(1),
    lineWidth: z.number().finite().positive(),
    pointRadius: z.number().finite().positive(),
});

const overlayLayerSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    sourceType: z.literal("geojson"),
    geometryKind: z.enum(["point", "line", "polygon", "mixed"]),
    featureCount: z.number().int().nonnegative(),
    collection: overlayCollectionSchema,
    style: overlayStyleSchema,
    createdAt: z.number().finite(),
    origin: z.discriminatedUnion("type", [
        z.object({
            type: z.literal("local-geojson"),
            filename: z.string().min(1),
        }),
        z.object({
            type: z.literal("csv"),
            filename: z.string().min(1),
        }),
        z.object({
            type: z.literal("geojson-url"),
            url: publicHttpUrlSchema,
        }),
    ]).optional(),
});

const xyzRasterSourceSchema = z.object({
    type: z.literal("xyz"),
    tiles: z.array(xyzTileTemplateSchema).min(1),
    tileSize: z.union([z.literal(256), z.literal(512)]),
});

const wmsRasterSourceSchema = z.object({
    type: z.literal("wms"),
    baseUrl: publicHttpUrlSchema,
    layerName: z.string().min(1),
    version: z.enum(["1.1.1", "1.3.0"]),
    format: z.enum(["image/png", "image/jpeg"]),
    transparent: z.boolean(),
    styleName: z.string(),
});

const rasterLayerSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    sourceType: z.enum(["xyz", "wms"]),
    visible: z.boolean(),
    opacity: z.number().finite().min(0).max(1),
    createdAt: z.number().finite(),
    attribution: z.string().optional(),
    minZoom: z.number().finite().min(0).max(24).optional(),
    maxZoom: z.number().finite().min(0).max(24).optional(),
    source: z.discriminatedUnion("type", [
        xyzRasterSourceSchema,
        wmsRasterSourceSchema,
    ]),
}).refine(
    (layer) => layer.sourceType === layer.source.type,
    { message: "Raster sourceType 与 source.type 不一致" },
).refine(
    (layer) => layer.minZoom === undefined ||
        layer.maxZoom === undefined ||
        layer.minZoom <= layer.maxZoom,
    { message: "Raster minZoom 不能大于 maxZoom" },
);

const analysisPropertiesSchema = z.union([
    landUsePropertiesSchema.extend({
        analysisOperation: z.literal("intersection"),
        sourceFeatureId: z.string(),
    }),
    landUsePropertiesSchema.extend({
        analysisOperation: z.literal("centroid"),
        sourceFeatureId: z.string(),
    }),
    z.object({
        analysisOperation: z.literal("dissolve"),
        landUseType: landUseTypeSchema.optional(),
    }),
    z.object({
        analysisOperation: z.literal("spatial-hexbin"),
        id: z.string().min(1),
        featureCount: z.number().int().nonnegative(),
        value: z.number().finite().nonnegative(),
        share: z.number().finite().min(0).max(1),
        rank: z.number().int().positive(),
        classIndex: z.number().int().min(0).max(4),
    }).passthrough(),
]);

const analysisGeometrySchema = z.discriminatedUnion("type", [
    pointGeometrySchema,
    polygonGeometrySchema,
    multiPolygonGeometrySchema,
]);

const analysisFeatureSchema = z.object({
    type: z.literal("Feature"),
    geometry: analysisGeometrySchema,
    properties: analysisPropertiesSchema,
});

const analysisLayerSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    operation: z.enum(["intersection", "dissolve", "centroid", "spatial-hexbin"]),
    geometryType: z.enum(["Point", "Polygon", "MultiPolygon"]),
    visible: z.boolean(),
    createdAt: z.number().finite(),
    featureCount: z.number().int().nonnegative(),
    collection: z.object({
        type: z.literal("FeatureCollection"),
        features: z.array(analysisFeatureSchema),
    }),
    metadata: z.object({
        method: z.literal("hexbin"),
        inputSource: z.union([
            z.enum(["filtered-primary", "buffer-query", "aoi-query"]),
            z.object({
                type: z.literal("overlay"),
                layerId: z.string().min(1),
            }),
        ]),
        weightMode: z.enum(["count", "area"]),
        cellSizeKm: z.number().finite().positive(),
        temporalValue: z.number().finite().optional(),
        createdFromFeatureCount: z.number().int().nonnegative(),
    }).optional(),
});

const queryConditionSchema = z.object({
    id: z.string().min(1),
    field: z.enum(["id", "landUseType", "areaM2", "districtCode", "builtYear"]),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "between"]),
    value: z.union([z.string(), z.number().finite()]),
    value2: z.union([z.string(), z.number().finite()]).optional(),
});

const queryGroupSchema = z.object({
    id: z.string().min(1),
    logic: z.enum(["and", "or"]),
    conditions: z.array(queryConditionSchema),
});

const attributeQuerySchema = z.object({
    logic: z.enum(["and", "or"]),
    groups: z.array(queryGroupSchema),
});

const layerStyleSchema = z.object({
    layerVisible: z.boolean(),
    fillVisible: z.boolean(),
    fillColor: z.string().min(1),
    fillOpacity: z.number().finite().min(0).max(1),
    outlineVisible: z.boolean(),
    outlineColor: z.string().min(1),
    outlineWidth: z.number().finite().nonnegative(),
    outlineOpacity: z.number().finite().min(0).max(1),
    symbologyMode: z.enum(["single", "categorized", "graduated"]),
    categorizedField: z.literal("landUseType"),
    graduatedField: z.enum(["areaM2", "builtYear"]),
    classificationMethod: z.enum(["equalInterval", "quantile"]),
    classCount: z.union([
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
    ]),
    colorRamp: z.enum(["teal", "blue", "green", "orange", "purple"]),
});

const typeCountsSchema = z.object({
    residential: z.number().int().nonnegative(),
    commercial: z.number().int().nonnegative(),
    industrial: z.number().int().nonnegative(),
    green: z.number().int().nonnegative(),
    public: z.number().int().nonnegative(),
    transportation: z.number().int().nonnegative(),
    other: z.number().int().nonnegative(),
});

const spatialQueryResultSchema = z.object({
    relation: z.enum(["intersects", "within"]),
    featureIds: z.array(z.string()),
    featureCount: z.number().int().nonnegative(),
    totalAreaM2: z.number().finite().nonnegative(),
    totalAreaKm2: z.number().finite().nonnegative(),
    typeCounts: typeCountsSchema,
});

const bufferResultSchema = z.object({
    distance: z.number().finite().positive(),
    unit: z.literal("meter"),
    areaM2: z.number().finite().nonnegative(),
    areaKm2: z.number().finite().nonnegative(),
    featureCount: z.number().int().nonnegative().optional(),
});

const temporalConfigSchema = z.object({
    enabled: z.boolean(),
    field: z.string(),
    type: z.enum(["year", "date", "datetime"]),
    min: z.number().finite(),
    max: z.number().finite(),
    current: z.number().finite(),
}).refine(
    (config) => !config.enabled || (
        config.field.trim().length > 0 &&
        config.min <= config.current &&
        config.current <= config.max
    ),
    { message: "启用的时间配置无效" },
);

export const geoInsightProjectSchema: z.ZodType<GeoInsightProject> = z.object({
    format: z.literal(GEOINSIGHT_PROJECT_FORMAT),
    version: z.literal(GEOINSIGHT_PROJECT_VERSION),
    project: z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(60),
        createdAt: z.number().finite(),
        updatedAt: z.number().finite(),
    }),
    data: z.object({
        primaryDataset: primaryDatasetSchema,
        overlayLayers: z.array(overlayLayerSchema),
        rasterLayers: z.array(rasterLayerSchema).default([]),
        analysisResultLayers: z.array(analysisLayerSchema),
    }),
    map: z.object({
        basemap: z.enum(["dark", "light", "blank"]),
        center: positionSchema,
        zoom: z.number().finite().min(0).max(24),
        bearing: z.number().finite(),
        pitch: z.number().finite().min(0).max(85),
    }),
    workspace: z.object({
        filters: z.object({
            landUseTypes: z.array(landUseTypeSchema),
            minimumBuiltYear: z.number().finite().nullable(),
            districtCode: z.string(),
        }),
        attributeQuery: attributeQuerySchema.nullable(),
        layerStyle: layerStyleSchema,
        selectedFeatureIds: z.array(z.string()),
        selectedFeatureId: z.string().nullable(),
        aoiFeature: z.object({
            type: z.literal("Feature"),
            geometry: polygonGeometrySchema,
            properties: geoJsonPropertiesSchema,
        }).nullable(),
        aoiRelation: z.enum(["intersects", "within"]),
        aoiQueryResult: spatialQueryResultSchema.nullable(),
        bufferFeature: z.object({
            type: z.literal("Feature"),
            geometry: polygonGeometrySchema,
            properties: geoJsonPropertiesSchema,
        }).nullable(),
        bufferResult: bufferResultSchema.nullable(),
        bufferSpatialQueryResult: spatialQueryResultSchema.nullable(),
        temporalConfig: temporalConfigSchema.optional(),
    }),
});
