import type { AgentCommand, AgentPlan } from "../../types/agent";
import type { AnalysisWorkflow, WorkflowStep } from "../../types/workflow";
import { analysisWorkflowSchema } from "./workflowSchema";
import { validateWorkflow } from "./workflowValidator";

export interface AgentPlanConversionResult {
    workflow: AnalysisWorkflow | null;
    unsupportedCommands: AgentCommand["type"][];
    message: string | null;
}

function filterCommandToStep(command: Extract<AgentCommand, { type: "apply_filter" }>): WorkflowStep | null {
    const groups = [];
    if (command.payload.landUseTypes?.length) {
        groups.push({
            id: crypto.randomUUID(),
            logic: "or" as const,
            conditions: command.payload.landUseTypes.map((landUseType) => ({
                id: crypto.randomUUID(),
                field: "landUseType" as const,
                operator: "eq" as const,
                value: landUseType,
            })),
        });
    }
    const conditions = [];
    if (command.payload.minimumBuiltYear !== undefined && command.payload.minimumBuiltYear !== null) {
        conditions.push({ id: crypto.randomUUID(), field: "builtYear" as const, operator: "gte" as const, value: command.payload.minimumBuiltYear });
    }
    if (command.payload.districtCode?.trim()) {
        conditions.push({ id: crypto.randomUUID(), field: "districtCode" as const, operator: "eq" as const, value: command.payload.districtCode.trim() });
    }
    if (conditions.length > 0) {
        groups.push({ id: crypto.randomUUID(), logic: "and" as const, conditions });
    }
    if (groups.length === 0) return null;
    return {
        id: crypto.randomUUID(), type: "attribute-query", enabled: true,
        query: { logic: "and", groups },
    };
}

export function agentPlanToWorkflow(plan: AgentPlan, name = `AI · ${plan.summary}`): AgentPlanConversionResult {
    const steps: WorkflowStep[] = [];
    const unsupportedCommands: AgentCommand["type"][] = [];
    let latestQuery: "buffer-query" | "aoi-query" | null = null;

    for (const command of plan.commands) {
        if (command.type === "apply_filter") {
            const step = filterCommandToStep(command);
            if (step) steps.push(step); else unsupportedCommands.push(command.type);
        } else if (command.type === "create_buffer") {
            steps.push({ id: crypto.randomUUID(), type: "create-buffer", enabled: true, distanceM: command.distanceM });
        } else if (command.type === "query_buffer") {
            steps.push({ id: crypto.randomUUID(), type: "spatial-query", enabled: true, relation: command.relation, mask: "buffer" });
            latestQuery = "buffer-query";
        } else if (command.type === "query_aoi") {
            steps.push({ id: crypto.randomUUID(), type: "spatial-query", enabled: true, relation: command.relation, mask: "aoi" });
            latestQuery = "aoi-query";
        } else if (command.type === "run_geoprocessing") {
            const source = command.payload.inputSource;
            const sourceMatches = source === "filtered" ? latestQuery === null : source === latestQuery;
            if (!sourceMatches) {
                unsupportedCommands.push(command.type);
                continue;
            }
            if (command.payload.operation === "centroid") steps.push({ id: crypto.randomUUID(), type: "centroid", enabled: true });
            if (command.payload.operation === "dissolve") steps.push({ id: crypto.randomUUID(), type: "dissolve", enabled: true, field: command.payload.dissolveField });
            if (command.payload.operation === "intersection") steps.push({ id: crypto.randomUUID(), type: "intersection", enabled: true, overlay: command.payload.overlaySource });
        } else {
            unsupportedCommands.push(command.type);
        }
    }

    if (unsupportedCommands.length > 0 || steps.length === 0) {
        return {
            workflow: null,
            unsupportedCommands,
            message: unsupportedCommands.length > 0
                ? `当前计划包含无法完整转换的命令：${[...new Set(unsupportedCommands)].join("、")}。`
                : "当前计划不包含可转换的分析步骤。",
        };
    }
    const now = Date.now();
    const candidate: AnalysisWorkflow = {
        id: crypto.randomUUID(), name: name.slice(0, 60), description: "由 Agent Plan 创建",
        createdAt: now, updatedAt: now, input: { type: "current-filtered-primary" }, steps,
        output: { mode: "analysis-layer", name: plan.summary.slice(0, 80) || "Agent Workflow Result" },
    };
    const parsed = analysisWorkflowSchema.safeParse(candidate);
    if (!parsed.success) {
        return { workflow: null, unsupportedCommands: [], message: "Agent Plan 转换后的工作流未通过 Schema 校验。" };
    }
    const validationError = validateWorkflow(parsed.data).find(
        (issue) => issue.severity === "error",
    );
    return validationError
        ? { workflow: null, unsupportedCommands: [], message: validationError.message }
        : { workflow: parsed.data, unsupportedCommands: [], message: null };
}
