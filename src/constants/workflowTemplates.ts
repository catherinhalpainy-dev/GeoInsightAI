import type { WorkflowTemplateDefinition } from "../types/workflow";

export const WORKFLOW_TEMPLATES: readonly WorkflowTemplateDefinition[] = [
    {
        id: "selected-parcel-impact",
        name: "Selected Parcel Impact",
        description: "为当前选中地块创建 500 米缓冲区并查询相交地块。",
        input: { type: "primary" },
        steps: [
            { id: "template-buffer", type: "create-buffer", enabled: true, distanceM: 500 },
            { id: "template-query", type: "spatial-query", enabled: true, relation: "intersects", mask: "buffer" },
        ],
        output: { mode: "analysis-layer", name: "Impact Parcels" },
    },
    {
        id: "commercial-hexbin",
        name: "Commercial Hexbin",
        description: "筛选商业用地并执行 0.5 km 要素数量六边形聚合。",
        input: { type: "primary" },
        steps: [
            {
                id: "template-commercial-query",
                type: "attribute-query",
                enabled: true,
                query: {
                    logic: "and",
                    groups: [{
                        id: "template-query-group",
                        logic: "and",
                        conditions: [{
                            id: "template-query-condition",
                            field: "landUseType",
                            operator: "eq",
                            value: "commercial",
                        }],
                    }],
                },
            },
            { id: "template-hexbin", type: "hexbin", enabled: true, weightMode: "count", cellSizeKm: 0.5 },
        ],
        output: { mode: "analysis-layer", name: "Commercial Hotspots" },
    },
    {
        id: "current-selection-centroids",
        name: "Current Selection Centroids",
        description: "为当前筛选结果生成中心点。",
        input: { type: "current-filtered-primary" },
        steps: [{ id: "template-centroid", type: "centroid", enabled: true }],
        output: { mode: "analysis-layer", name: "Centroids" },
    },
];

export function createWorkflowFromTemplate(template: WorkflowTemplateDefinition) {
    const now = Date.now();
    return {
        id: crypto.randomUUID(),
        name: template.name,
        description: template.description,
        createdAt: now,
        updatedAt: now,
        input: { ...template.input },
        steps: template.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
        output: { ...template.output },
    };
}
