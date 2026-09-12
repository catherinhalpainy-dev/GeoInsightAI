import type { AnalysisWorkflow } from "../../types/workflow";
import { analysisWorkflowSchema } from "./workflowSchema";
import { validateWorkflow } from "./workflowValidator";

export class WorkflowValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "WorkflowValidationError";
    }
}

export function serializeWorkflow(workflow: AnalysisWorkflow) {
    return JSON.stringify(workflow, null, 2);
}

export function exportWorkflowFile(workflow: AnalysisWorkflow) {
    const safeName = workflow.name.trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/^-+|-+$/g, "") || "analysis-workflow";
    const blob = new Blob([serializeWorkflow(workflow)], {
        type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeName}.geoinsight-workflow.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

export function deserializeWorkflow(input: unknown): AnalysisWorkflow {
    let parsed: unknown = input;
    if (typeof input === "string") {
        try {
            parsed = JSON.parse(input) as unknown;
        } catch {
            throw new WorkflowValidationError("工作流文件不是有效的 JSON。");
        }
    }
    const result = analysisWorkflowSchema.safeParse(parsed);
    if (!result.success) throw new WorkflowValidationError("无法识别该 GeoInsight 工作流文件。");
    const validationError = validateWorkflow(result.data).find(
        (issue) => issue.severity === "error",
    );
    if (validationError) throw new WorkflowValidationError(validationError.message);
    const now = Date.now();
    return {
        ...result.data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        steps: result.data.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
    };
}

export function duplicateWorkflow(workflow: AnalysisWorkflow): AnalysisWorkflow {
    const now = Date.now();
    return {
        ...workflow,
        id: crypto.randomUUID(),
        name: `${workflow.name} - Copy`,
        createdAt: now,
        updatedAt: now,
        input: { ...workflow.input },
        output: { ...workflow.output },
        steps: workflow.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
    };
}
