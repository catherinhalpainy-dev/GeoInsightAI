import { z } from "zod";

const finiteNumber = z.number().finite();

const reportKpiSchema = z.object({
    featureCount: z.number().int().nonnegative(),
    totalAreaM2: finiteNumber.nonnegative(),
    averageAreaM2: finiteNumber.nonnegative(),
    selectedCount: z.number().int().nonnegative(),
    districtCount: z.number().int().nonnegative(),
}).strict();

const categorySchema = z.object({
    key: z.string().min(1).max(80),
    label: z.string().min(1).max(80),
    color: z.string().min(1).max(32),
    count: z.number().int().nonnegative(),
    areaM2: finiteNumber.nonnegative(),
    averageAreaM2: finiteNumber.nonnegative(),
    percentage: finiteNumber.min(0).max(100),
}).strict();

const analysisLayerSchema = z.object({
    name: z.string().min(1).max(160),
    operation: z.string().min(1).max(80),
    featureCount: z.number().int().nonnegative(),
    geometryType: z.string().min(1).max(80),
    visible: z.boolean(),
}).strict();

const spatialAnalysisSchema = z.object({
    hasBuffer: z.boolean(),
    bufferDistanceM: finiteNumber.nonnegative().nullable(),
    bufferAreaM2: finiteNumber.nonnegative().nullable(),
    spatialQueryFeatureCount: z.number().int().nonnegative(),
    spatialQueryRelation: z.string().max(40).nullable(),
    aoiFeatureCount: z.number().int().nonnegative(),
    aoiRelation: z.string().max(40).nullable(),
    analysisResultLayers: z.array(analysisLayerSchema).max(100),
}).strict();

const dataQualitySchema = z.object({
    available: z.boolean(),
    targetName: z.string().max(160).optional(),
    errorCount: z.number().int().nonnegative().optional(),
    warningCount: z.number().int().nonnegative().optional(),
    passRate: finiteNumber.min(0).max(100).optional(),
    scannedAt: finiteNumber.nonnegative().optional(),
}).strict();

const symbologySchema = z.object({
    mode: z.enum(["single", "categorized", "graduated"]),
    graduatedField: z.enum(["areaM2", "builtYear"]).optional(),
    classificationMethod: z.enum(["equalInterval", "quantile"]).optional(),
    classCount: z.number().int().min(3).max(6).optional(),
    colorRamp: z.enum(["teal", "blue", "green", "orange", "purple"]).optional(),
}).strict();

const temporalSchema = z.object({
    enabled: z.boolean(),
    field: z.string().min(1).max(120),
    type: z.enum(["year", "date", "datetime"]),
    min: finiteNumber,
    max: finiteNumber,
    current: finiteNumber,
    featureCount: z.number().int().nonnegative(),
}).strict();

const spatialStatisticsSchema = z.object({
    method: z.enum(["heatmap", "hexbin"]),
    inputFeatureCount: z.number().int().nonnegative(),
    analysisPointCount: z.number().int().nonnegative(),
    weightMode: z.enum(["count", "area"]),
    cellSizeKm: finiteNumber.positive().optional(),
    occupiedCellCount: z.number().int().nonnegative().optional(),
    maxCellValue: finiteNumber.nonnegative().optional(),
    maxCellShare: finiteNumber.min(0).max(1).optional(),
    meanCenter: z.tuple([finiteNumber, finiteNumber]).nullable(),
}).strict();

const temporalCompareCategorySchema = z.object({
    key: z.string().min(1).max(80),
    label: z.string().min(1).max(80),
    beforeCount: z.number().int().nonnegative(),
    afterCount: z.number().int().nonnegative(),
    countDelta: z.number().int(),
    beforeAreaM2: finiteNumber.nonnegative(),
    afterAreaM2: finiteNumber.nonnegative(),
    areaDeltaM2: finiteNumber,
    beforeShare: finiteNumber.min(0).max(1),
    afterShare: finiteNumber.min(0).max(1),
    shareDelta: finiteNumber.min(-1).max(1),
}).strict();

const temporalComparisonSchema = z.object({
    beforeTime: finiteNumber,
    afterTime: finiteNumber,
    beforeFeatureCount: z.number().int().nonnegative(),
    afterFeatureCount: z.number().int().nonnegative(),
    featureCountDelta: z.number().int(),
    beforeTotalAreaM2: finiteNumber.nonnegative(),
    afterTotalAreaM2: finiteNumber.nonnegative(),
    totalAreaDeltaM2: finiteNumber,
    categories: z.array(temporalCompareCategorySchema).max(30),
}).strict();

export const AIReportContextSchema = z.object({
    projectName: z.string().min(1).max(160),
    datasetName: z.string().min(1).max(160),
    generatedAt: finiteNumber.nonnegative(),
    filterSummary: z.array(z.string().max(500)).max(30),
    kpi: reportKpiSchema,
    categories: z.array(categorySchema).max(30),
    spatialAnalysis: spatialAnalysisSchema,
    dataQuality: dataQualitySchema,
    symbology: symbologySchema,
    temporal: temporalSchema.optional(),
    spatialStatistics: spatialStatisticsSchema.optional(),
    temporalComparison: temporalComparisonSchema.optional(),
}).strict();

export const ReportInsightResponseSchema = z.object({
    executiveSummary: z.string().min(1).max(2_000),
    insights: z.array(z.object({
        category: z.enum([
            "overview",
            "distribution",
            "spatial",
            "quality",
            "recommendation",
        ]),
        title: z.string().min(1).max(120),
        content: z.string().min(1).max(1_000),
    }).strict()).min(1).max(8),
}).strict();

export const ReportInsightRequestSchema = z.object({
    context: AIReportContextSchema,
}).strict();
