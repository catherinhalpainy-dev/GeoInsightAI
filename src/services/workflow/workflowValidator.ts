import { getAvailableTemporalValues } from "../temporal/filterTemporalFeatures";
import { validateAttributeQuery } from "../gis/attributeQuery";
import type {
    AnalysisWorkflow,
    WorkflowExecutionContext,
    WorkflowValidationIssue,
} from "../../types/workflow";

export function validateWorkflow(workflow: AnalysisWorkflow): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];
    if (!workflow.name.trim()) issues.push({ stepId: null, severity: "error", code: "invalid-name", message: "工作流名称不能为空。" });
    if (!workflow.output.name.trim()) issues.push({ stepId: null, severity: "error", code: "invalid-output-name", message: "输出名称不能为空。" });

    const ids = new Set<string>();
    let hasBuffer = false;
    let knownGeometry: "polygon" | "point" | "unknown" =
        workflow.input.type === "primary" || workflow.input.type === "current-filtered-primary"
            ? "polygon"
            : "unknown";
    let landUseCompatible: boolean | null = knownGeometry === "polygon" ? true : null;
    for (const step of workflow.steps) {
        if (ids.has(step.id)) issues.push({ stepId: step.id, severity: "error", code: "duplicate-step-id", message: "步骤 ID 必须唯一。" });
        ids.add(step.id);
        if (!step.enabled) continue;
        const requiresLandUsePolygon = step.type === "attribute-query" ||
            step.type === "spatial-query" || step.type === "centroid" ||
            step.type === "dissolve" || step.type === "intersection";
        if (requiresLandUsePolygon && (knownGeometry === "point" || landUseCompatible === false)) {
            issues.push({
                stepId: step.id,
                severity: "error",
                code: "incompatible-geometry",
                message: `${step.type} 需要符合主数据业务结构的面要素，前置步骤输出不兼容。`,
            });
        }
        if (step.type === "create-buffer") {
            if (!Number.isFinite(step.distanceM) || step.distanceM <= 0 || step.distanceM > 50_000) issues.push({ stepId: step.id, severity: "error", code: "invalid-parameter", message: "缓冲距离必须大于 0 且不超过 50,000 米。" });
            hasBuffer = true;
        }
        if ((step.type === "spatial-query" && step.mask === "buffer") || (step.type === "intersection" && step.overlay === "buffer")) {
            if (!hasBuffer) issues.push({ stepId: step.id, severity: "error", code: "missing-buffer-dependency", message: "该步骤依赖前面已启用的 Buffer 步骤。" });
        }
        if (step.type === "attribute-query") {
            const error = validateAttributeQuery(step.query);
            if (error) issues.push({ stepId: step.id, severity: "error", code: "invalid-parameter", message: error });
        }
        if (step.type === "hexbin" && (!Number.isFinite(step.cellSizeKm) || step.cellSizeKm < 0.05 || step.cellSizeKm > 100)) {
            issues.push({ stepId: step.id, severity: "error", code: "invalid-parameter", message: "网格尺寸必须在 0.05–100 km 之间。" });
        }
        if (step.type === "centroid") knownGeometry = "point";
        if (step.type === "dissolve") {
            knownGeometry = "polygon";
            landUseCompatible = false;
        }
        if (step.type === "intersection") knownGeometry = "polygon";
        if (step.type === "hexbin") {
            knownGeometry = "polygon";
            landUseCompatible = false;
        }
    }
    return issues;
}

export function validateWorkflowRuntime(
    workflow: AnalysisWorkflow,
    context: WorkflowExecutionContext,
): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];
    if (context.workingCollection.features.length === 0) issues.push({ stepId: null, severity: "error", code: "empty-input", message: "工作流输入没有可处理的要素。" });
    const values = getAvailableTemporalValues(context.originalCollection.features, context.temporalConfig);
    for (const step of workflow.steps.filter((item) => item.enabled)) {
        if (step.type === "create-buffer" && !context.selectedFeature) issues.push({ stepId: step.id, severity: "error", code: "missing-selected-feature", message: "创建缓冲区需要当前选择一个主数据要素。" });
        if (((step.type === "spatial-query" && step.mask === "aoi") || (step.type === "intersection" && step.overlay === "aoi")) && !context.aoi) issues.push({ stepId: step.id, severity: "error", code: "missing-aoi", message: "该步骤需要工作区中已完成的 AOI。" });
        if (step.type === "temporal-filter" && (!context.temporalConfig.enabled || !context.temporalConfig.field || !values.includes(step.temporalValue))) issues.push({ stepId: step.id, severity: "error", code: "invalid-temporal-value", message: "时间分析未启用，时间字段未配置，或指定时间值不存在于当前输入。" });
        if (step.type === "hexbin" && step.weightMode === "area") {
            const hasCompleteArea = context.workingCollection.features.length > 0 &&
                context.workingCollection.features.every((feature) => {
                    const properties = feature.properties;
                    if (typeof properties !== "object" || properties === null) return false;
                    const areaM2 = (properties as Record<string, unknown>).areaM2;
                    return typeof areaM2 === "number" && Number.isFinite(areaM2) && areaM2 > 0;
                });
            if (!hasCompleteArea) issues.push({ stepId: step.id, severity: "error", code: "missing-area-weight", message: "Area 权重需要每个输入要素都具有合法的 areaM2。" });
        }
    }
    return issues;
}
