import { z } from "zod";

export const LandUseTypeSchema = z.enum([
    "residential", "commercial", "industrial", "green",
    "public", "transportation", "other",
]);

export const SymbologyModeSchema = z.enum([
    "single", "categorized", "graduated",
]);
export const GraduatedFieldSchema = z.enum(["areaM2", "builtYear"]);
export const ClassificationMethodSchema = z.enum(["equalInterval", "quantile"]);
export const GraduatedClassCountSchema = z.union([
    z.literal(3), z.literal(4), z.literal(5), z.literal(6),
]);
export const ColorRampSchema = z.enum([
    "teal", "blue", "green", "orange", "purple",
]);

export const ApplyFilterCommandSchema = z.object({
    type: z.literal("apply_filter"),
    payload: z.object({
        landUseTypes: z.array(LandUseTypeSchema).optional(),
        minimumBuiltYear: z.number().int().nullable().optional(),
        districtCode: z.string().optional(),
    }).strict(),
}).strict();

export const ClearFiltersCommandSchema = z.object({
    type: z.literal("clear_filters"),
}).strict();

export const UpdateLayerStyleCommandSchema = z.object({
    type: z.literal("update_layer_style"),
    payload: z.object({
        layerVisible: z.boolean().optional(),
        fillVisible: z.boolean().optional(),
        fillColor: z.string().optional(),
        fillOpacity: z.number().min(0).max(1).optional(),
        outlineVisible: z.boolean().optional(),
        outlineColor: z.string().optional(),
        outlineWidth: z.number().min(0.5).max(6).optional(),
        outlineOpacity: z.number().min(0).max(1).optional(),
        colorMode: z.enum(["classified", "single"]).optional(),
    }).strict(),
}).strict();

export const FitBoundsCommandSchema = z.object({
    type: z.literal("fit_map_bounds"),
}).strict();
export const NavigateStatisticsCommandSchema = z.object({
    type: z.literal("navigate_statistics"),
}).strict();
export const CreateBufferCommandSchema = z.object({
    type: z.literal("create_buffer"),
    distanceM: z.number().positive().max(50_000),
}).strict();
export const QueryBufferCommandSchema = z.object({
    type: z.literal("query_buffer"),
    relation: z.literal("intersects"),
}).strict();
export const QueryAoiCommandSchema = z.object({
    type: z.literal("query_aoi"),
    relation: z.enum(["intersects", "within"]),
}).strict();

const GeoprocessingInputSourceSchema = z.enum([
    "filtered", "aoi-query", "buffer-query",
]);

export const RunGeoprocessingCommandSchema = z.object({
    type: z.literal("run_geoprocessing"),
    payload: z.discriminatedUnion("operation", [
        z.object({
            operation: z.literal("intersection"),
            inputSource: GeoprocessingInputSourceSchema,
            overlaySource: z.enum(["aoi", "buffer"]),
        }).strict(),
        z.object({
            operation: z.literal("dissolve"),
            inputSource: GeoprocessingInputSourceSchema,
            dissolveField: z.enum(["all", "landUseType"]),
        }).strict(),
        z.object({
            operation: z.literal("centroid"),
            inputSource: GeoprocessingInputSourceSchema,
        }).strict(),
    ]),
}).strict();

export const UpdateSymbologyCommandSchema = z.object({
    type: z.literal("update_symbology"),
    payload: z.discriminatedUnion("mode", [
        z.object({ mode: z.literal("single") }).strict(),
        z.object({ mode: z.literal("categorized") }).strict(),
        z.object({
            mode: z.literal("graduated"),
            field: GraduatedFieldSchema,
            method: ClassificationMethodSchema,
            classCount: GraduatedClassCountSchema,
            colorRamp: ColorRampSchema,
        }).strict(),
    ]),
}).strict();

export const SetAnalysisLayerVisibilityCommandSchema = z.object({
    type: z.literal("set_analysis_layer_visibility"),
    layerId: z.string().min(1),
    visible: z.boolean(),
}).strict();

export const AgentCommandSchema = z.discriminatedUnion("type", [
    ApplyFilterCommandSchema,
    ClearFiltersCommandSchema,
    UpdateLayerStyleCommandSchema,
    FitBoundsCommandSchema,
    NavigateStatisticsCommandSchema,
    CreateBufferCommandSchema,
    QueryBufferCommandSchema,
    QueryAoiCommandSchema,
    RunGeoprocessingCommandSchema,
    UpdateSymbologyCommandSchema,
    SetAnalysisLayerVisibilityCommandSchema,
]);
export type AgentCommand = z.infer<typeof AgentCommandSchema>;

export const AgentPlanSchema = z.object({
    summary: z.string().min(1),
    requiresConfirmation: z.boolean(),
    commands: z.array(AgentCommandSchema).max(8),
}).strict();
export type AgentPlan = z.infer<typeof AgentPlanSchema>;

const BaseLayerStyleSummarySchema = z.object({
    layerVisible: z.boolean(),
    fillVisible: z.boolean(),
    fillColor: z.string(),
    fillOpacity: z.number().min(0).max(1),
    outlineVisible: z.boolean(),
    outlineColor: z.string(),
    outlineWidth: z.number(),
    outlineOpacity: z.number().min(0).max(1),
    symbologyMode: SymbologyModeSchema,
}).strict();

const SymbologySummarySchema = z.object({
    mode: SymbologyModeSchema,
    field: GraduatedFieldSchema.nullable(),
    method: ClassificationMethodSchema.nullable(),
    classCount: GraduatedClassCountSchema.nullable(),
    colorRamp: ColorRampSchema.nullable(),
}).strict();

export const AgentContextSchema = z.object({
    datasetName: z.string(),
    featureCount: z.number().int().nonnegative(),
    filteredFeatureCount: z.number().int().nonnegative(),
    currentFilters: z.object({
        landUseTypes: z.array(LandUseTypeSchema),
        minimumBuiltYear: z.number().int().nullable(),
        districtCode: z.string(),
    }).strict(),
    currentLayerStyle: BaseLayerStyleSummarySchema,
    selectedFeature: z.object({
        id: z.string(),
        landUseType: LandUseTypeSchema.optional(),
    }).strict().nullable(),
    hasBuffer: z.boolean(),
    bufferDistanceM: z.number().positive().nullable(),
    hasAoi: z.boolean(),
    aoiCompleted: z.boolean(),
    bufferQueryFeatureCount: z.number().int().nonnegative(),
    aoiQueryFeatureCount: z.number().int().nonnegative(),
    analysisLayers: z.array(z.object({
        id: z.string(),
        name: z.string(),
        operation: z.enum(["intersection", "dissolve", "centroid"]),
        featureCount: z.number().int().nonnegative(),
        visible: z.boolean(),
    }).strict()),
    overlayLayers: z.array(z.object({
        id: z.string(),
        name: z.string(),
        geometryKind: z.enum(["point", "line", "polygon", "mixed"]),
        featureCount: z.number().int().nonnegative(),
        visible: z.boolean(),
    }).strict()),
    symbology: SymbologySummarySchema,
}).strict();
export type AgentContext = z.infer<typeof AgentContextSchema>;

export const AgentPlanRequestSchema = z.object({
    message: z.string().trim().min(1),
    context: AgentContextSchema,
}).strict();
export const AgentResumeRequestSchema = z.object({
    threadId: z.string().min(1),
    approved: z.boolean(),
}).strict();
export type AgentResumeRequest = z.infer<typeof AgentResumeRequestSchema>;
