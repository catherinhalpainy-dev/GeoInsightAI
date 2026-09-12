import type {
    FeatureCollection,
    GeoJsonProperties,
    MultiPolygon,
    Point,
    Polygon,
} from "geojson";

import type {
    AnalysisResultFeature,
    AnalysisResultFeatureCollection,
    AnalysisResultGeometryType,
    AnalysisResultLayer,
} from "../../types/analysis";
import type { LandUseFeatureCollection, LandUseProperties } from "../../types/landUse";
import type {
    AnalysisWorkflow,
    WorkflowExecutionContext,
    WorkflowExecutionResult,
    WorkflowFeatureCollection,
    WorkflowGeometry,
    WorkflowStep,
    WorkflowStepRunResult,
} from "../../types/workflow";
import { createBuffer } from "../gis/buffer";
import { filterFeaturesByQuery } from "../gis/attributeQuery";
import { createCentroids, dissolveFeatures, intersectFeaturesWithGeometry } from "../gis/geoprocessing";
import { queryFeaturesByGeometry } from "../gis/spatialQuery";
import { createHexbinAnalysis } from "../gis/spatialStatistics";
import { filterFeaturesAtTemporalValue } from "../temporal/filterTemporalFeatures";
import { validateWorkflow, validateWorkflowRuntime } from "./workflowValidator";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLandUseProperties(value: unknown): value is LandUseProperties {
    if (!isRecord(value)) return false;
    return typeof value.id === "string" && value.id.length > 0 &&
        typeof value.landUseType === "string" &&
        ["residential", "commercial", "industrial", "green", "public", "transportation", "other"].includes(value.landUseType) &&
        typeof value.areaM2 === "number" && Number.isFinite(value.areaM2) &&
        typeof value.districtCode === "string" &&
        (value.builtYear === null || (typeof value.builtYear === "number" && Number.isFinite(value.builtYear)));
}

function isLandUseCollection(collection: WorkflowFeatureCollection): collection is LandUseFeatureCollection {
    return collection.features.every((feature) =>
        feature.geometry.type === "Polygon" && isLandUseProperties(feature.properties),
    );
}

function requireLandUsePolygons(collection: WorkflowFeatureCollection, operation: string): LandUseFeatureCollection {
    if (!isLandUseCollection(collection)) {
        const geometryTypes = [...new Set(collection.features.map((feature) => feature.geometry.type))].join("、") || "空";
        throw new Error(`${operation} 需要符合主数据业务结构的 Polygon 要素，当前输入为 ${geometryTypes}。`);
    }
    return collection;
}

function toWorkflowCollection<GeometryType extends WorkflowGeometry, Properties extends GeoJsonProperties>(
    collection: FeatureCollection<GeometryType, Properties>,
): WorkflowFeatureCollection {
    return {
        type: "FeatureCollection",
        features: collection.features.map((feature) => ({
            ...feature,
            geometry: feature.geometry,
            properties: feature.properties,
        })),
    };
}

function stepLabel(step: WorkflowStep) {
    switch (step.type) {
        case "attribute-query": return "属性查询";
        case "temporal-filter": return `时间过滤 ${step.temporalValue}`;
        case "create-buffer": return `Buffer ${step.distanceM}m`;
        case "spatial-query": return "空间查询";
        case "centroid": return "中心点";
        case "dissolve": return "融合";
        case "intersection": return "叠加求交";
        case "hexbin": return `Hexbin ${step.cellSizeKm}km`;
    }
}

function executeStep(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
) {
    switch (step.type) {
        case "attribute-query": {
            const input = requireLandUsePolygons(context.workingCollection, "属性查询");
            context.workingCollection = toWorkflowCollection({
                type: "FeatureCollection",
                features: filterFeaturesByQuery(input, step.query),
            });
            break;
        }
        case "temporal-filter":
            context.workingCollection = {
                type: "FeatureCollection",
                features: filterFeaturesAtTemporalValue(
                    context.workingCollection.features,
                    context.temporalConfig,
                    step.temporalValue,
                ),
            };
            break;
        case "create-buffer":
            if (!context.selectedFeature) throw new Error("请选择一个地块后再运行该工作流。");
            context.bufferGeometry = createBuffer(context.selectedFeature, step.distanceM);
            break;
        case "spatial-query": {
            const input = requireLandUsePolygons(context.workingCollection, "空间查询");
            const mask = step.mask === "buffer" ? context.bufferGeometry : context.aoi;
            if (!mask) throw new Error(step.mask === "buffer" ? "当前运行尚未生成 Buffer。" : "当前工作区没有已完成的 AOI。");
            context.workingCollection = toWorkflowCollection({
                type: "FeatureCollection",
                features: queryFeaturesByGeometry(input, mask, step.relation),
            });
            break;
        }
        case "centroid":
            context.workingCollection = toWorkflowCollection(createCentroids(
                requireLandUsePolygons(context.workingCollection, "中心点"),
            ));
            break;
        case "dissolve":
            context.workingCollection = toWorkflowCollection(dissolveFeatures(
                requireLandUsePolygons(context.workingCollection, "融合"),
                step.field,
            ));
            break;
        case "intersection": {
            const mask = step.overlay === "buffer" ? context.bufferGeometry : context.aoi;
            if (!mask) throw new Error(step.overlay === "buffer" ? "当前运行尚未生成 Buffer。" : "当前工作区没有已完成的 AOI。");
            context.workingCollection = toWorkflowCollection(intersectFeaturesWithGeometry(
                requireLandUsePolygons(context.workingCollection, "叠加求交"),
                mask,
            ));
            break;
        }
        case "hexbin": {
            if (context.workingCollection.features.length === 0) throw new Error("当前步骤没有可用于 Hexbin 的要素。");
            const result = createHexbinAnalysis(context.workingCollection, {
                sourceLayerId: context.sourceLayerId,
                weightMode: step.weightMode,
                cellSizeKm: step.cellSizeKm,
            });
            context.workingCollection = toWorkflowCollection(result.collection);
            context.intermediateOutputs[step.type] = context.workingCollection;
            return result.summary;
        }
    }
    context.intermediateOutputs[step.type] = context.workingCollection;
    return null;
}

function getOutputGeometryType(
    collection: WorkflowFeatureCollection,
    fallbackCollection?: WorkflowFeatureCollection,
): AnalysisResultGeometryType {
    const geometrySource = collection.features.length > 0
        ? collection
        : fallbackCollection;
    if (!geometrySource || geometrySource.features.length === 0) {
        throw new Error("工作流结果为空，且无法从输入推断分析图层几何类型。");
    }
    const types = new Set(geometrySource.features.map((feature) => feature.geometry.type));
    if (types.size === 1 && types.has("Point")) return "Point";
    if ([...types].every((type) => type === "Polygon" || type === "MultiPolygon")) {
        return types.has("MultiPolygon") ? "MultiPolygon" : "Polygon";
    }
    throw new Error(`当前 ${[...types].join("、") || "未知"} 几何不能保存为统一分析结果图层。`);
}

export function createWorkflowOutputLayer(
    workflow: AnalysisWorkflow,
    runId: string,
    inputFeatureCount: number,
    collection: WorkflowFeatureCollection,
    fallbackCollection?: WorkflowFeatureCollection,
): AnalysisResultLayer {
    const geometryType = getOutputGeometryType(collection, fallbackCollection);
    const features: AnalysisResultFeature[] = collection.features.map((feature) => {
        const geometry = feature.geometry as Point | Polygon | MultiPolygon;
        return {
            type: "Feature",
            ...(feature.id === undefined ? {} : { id: feature.id }),
            geometry,
            properties: {
                ...(isRecord(feature.properties) ? feature.properties : {}),
                analysisOperation: "workflow",
            },
        };
    });
    const outputCollection: AnalysisResultFeatureCollection = { type: "FeatureCollection", features };
    return {
        id: crypto.randomUUID(),
        name: workflow.output.name.trim(),
        operation: "workflow",
        geometryType,
        visible: true,
        createdAt: Date.now(),
        featureCount: features.length,
        collection: outputCollection,
        metadata: {
            method: "workflow",
            workflowId: workflow.id,
            workflowName: workflow.name,
            workflowRunId: runId,
            createdFromFeatureCount: inputFeatureCount,
            stepCount: workflow.steps.filter((step) => step.enabled).length,
        },
    };
}

function createPreflightFailure(
    workflow: AnalysisWorkflow,
    context: WorkflowExecutionContext,
    message: string,
    stepId: string | null,
): WorkflowExecutionResult {
    const now = Date.now();
    const failureStepId = stepId ?? workflow.steps.find((step) => step.enabled)?.id ?? null;
    const steps = workflow.steps.map<WorkflowStepRunResult>((step) => ({
        stepId: step.id,
        stepType: step.type,
        status: step.id === failureStepId ? "failed" : "skipped",
        startedAt: now,
        finishedAt: now,
        durationMs: 0,
        inputFeatureCount: context.workingCollection.features.length,
        outputFeatureCount: context.workingCollection.features.length,
        message: step.id === failureStepId ? message : "因预检失败未执行。",
    }));
    return {
        success: false,
        context,
        output: null,
        outputLayer: null,
        spatialStatisticsSummary: null,
        run: {
            id: crypto.randomUUID(), workflowId: workflow.id, workflowName: workflow.name,
            startedAt: now, finishedAt: now, durationMs: 0, status: "failed", steps,
            inputFeatureCount: context.originalCollection.features.length,
            outputFeatureCount: 0, errorMessage: message,
        },
    };
}

export function executeWorkflow(
    workflow: AnalysisWorkflow,
    initialContext: WorkflowExecutionContext,
): WorkflowExecutionResult {
    const context: WorkflowExecutionContext = {
        ...initialContext,
        workingCollection: toWorkflowCollection(initialContext.workingCollection),
        originalCollection: toWorkflowCollection(initialContext.originalCollection),
        intermediateOutputs: {},
    };
    const validationIssue = [...validateWorkflow(workflow), ...validateWorkflowRuntime(workflow, context)]
        .find((issue) => issue.severity === "error");
    if (validationIssue) return createPreflightFailure(workflow, context, validationIssue.message, validationIssue.stepId);

    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    const startedPerformance = performance.now();
    const stepResults: WorkflowStepRunResult[] = [];
    let spatialStatisticsSummary = null;
    let failed = false;
    let errorMessage: string | undefined;

    for (const step of workflow.steps) {
        const inputCount = context.workingCollection.features.length;
        const stepStartedAt = Date.now();
        const stepPerformance = performance.now();
        if (!step.enabled || failed) {
            stepResults.push({ stepId: step.id, stepType: step.type, status: "skipped", startedAt: stepStartedAt, finishedAt: Date.now(), durationMs: 0, inputFeatureCount: inputCount, outputFeatureCount: inputCount, message: !step.enabled ? "步骤已停用。" : "前一步失败，已跳过。" });
            continue;
        }
        try {
            const summary = executeStep(step, context);
            if (summary) spatialStatisticsSummary = summary;
            stepResults.push({ stepId: step.id, stepType: step.type, status: "success", startedAt: stepStartedAt, finishedAt: Date.now(), durationMs: performance.now() - stepPerformance, inputFeatureCount: inputCount, outputFeatureCount: context.workingCollection.features.length, message: `${stepLabel(step)}完成。` });
        } catch (error) {
            failed = true;
            errorMessage = error instanceof Error ? error.message : "工作流步骤执行失败。";
            stepResults.push({ stepId: step.id, stepType: step.type, status: "failed", startedAt: stepStartedAt, finishedAt: Date.now(), durationMs: performance.now() - stepPerformance, inputFeatureCount: inputCount, outputFeatureCount: context.workingCollection.features.length, message: errorMessage });
        }
    }

    let outputLayer: AnalysisResultLayer | null = null;
    if (!failed && workflow.output.mode === "analysis-layer") {
        try {
            outputLayer = createWorkflowOutputLayer(workflow, runId, context.originalCollection.features.length, context.workingCollection, context.originalCollection);
        } catch (error) {
            failed = true;
            errorMessage = error instanceof Error ? error.message : "无法创建分析结果图层。";
        }
    }
    const finishedAt = Date.now();
    return {
        success: !failed,
        context,
        output: failed ? null : context.workingCollection,
        outputLayer,
        spatialStatisticsSummary,
        run: {
            id: runId, workflowId: workflow.id, workflowName: workflow.name,
            startedAt, finishedAt, durationMs: performance.now() - startedPerformance,
            status: failed ? "failed" : "completed", steps: stepResults,
            inputFeatureCount: context.originalCollection.features.length,
            outputFeatureCount: failed ? 0 : context.workingCollection.features.length,
            ...(outputLayer ? { outputLayerId: outputLayer.id } : {}),
            ...(errorMessage ? { errorMessage } : {}),
        },
    };
}
