import { z } from "zod";

import type { AnalysisWorkflow } from "../../types/workflow";

const queryConditionSchema = z.object({
    id: z.string().min(1),
    field: z.enum(["id", "landUseType", "areaM2", "districtCode", "builtYear"]),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "between"]),
    value: z.union([z.string(), z.number().finite()]),
    value2: z.union([z.string(), z.number().finite()]).optional(),
}).strict();

const attributeQuerySchema = z.object({
    logic: z.enum(["and", "or"]),
    groups: z.array(z.object({
        id: z.string().min(1),
        logic: z.enum(["and", "or"]),
        conditions: z.array(queryConditionSchema),
    }).strict()).min(1),
}).strict();

const inputSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("primary") }).strict(),
    z.object({ type: z.literal("current-filtered-primary") }).strict(),
    z.object({ type: z.literal("overlay"), layerId: z.string().min(1) }).strict(),
    z.object({ type: z.literal("analysis-result"), layerId: z.string().min(1) }).strict(),
]);

export const workflowStepSchema = z.discriminatedUnion("type", [
    z.object({ id: z.string().min(1), type: z.literal("attribute-query"), enabled: z.boolean(), query: attributeQuerySchema }).strict(),
    z.object({ id: z.string().min(1), type: z.literal("temporal-filter"), enabled: z.boolean(), temporalValue: z.number().finite() }).strict(),
    z.object({ id: z.string().min(1), type: z.literal("create-buffer"), enabled: z.boolean(), distanceM: z.number().finite().positive().max(50_000) }).strict(),
    z.object({ id: z.string().min(1), type: z.literal("spatial-query"), enabled: z.boolean(), relation: z.enum(["intersects", "within"]), mask: z.enum(["buffer", "aoi"]) }).strict(),
    z.object({ id: z.string().min(1), type: z.literal("centroid"), enabled: z.boolean() }).strict(),
    z.object({ id: z.string().min(1), type: z.literal("dissolve"), enabled: z.boolean(), field: z.enum(["all", "landUseType"]) }).strict(),
    z.object({ id: z.string().min(1), type: z.literal("intersection"), enabled: z.boolean(), overlay: z.enum(["buffer", "aoi"]) }).strict(),
    z.object({ id: z.string().min(1), type: z.literal("hexbin"), enabled: z.boolean(), weightMode: z.enum(["count", "area"]), cellSizeKm: z.number().finite().min(0.05).max(100) }).strict(),
]);

export const analysisWorkflowSchema: z.ZodType<AnalysisWorkflow> = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(60),
    description: z.string().max(500),
    createdAt: z.number().finite(),
    updatedAt: z.number().finite(),
    input: inputSchema,
    steps: z.array(workflowStepSchema).max(30),
    output: z.object({
        mode: z.enum(["preview", "analysis-layer"]),
        name: z.string().trim().min(1).max(80),
    }).strict(),
}).strict();

export function parseAnalysisWorkflow(input: unknown) {
    return analysisWorkflowSchema.parse(input);
}
