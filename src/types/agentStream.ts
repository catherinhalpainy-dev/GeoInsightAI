import { z } from "zod";

import { AgentPlanSchema } from "../../server/agent/schemas";

export const AgentRunStatusSchema = z.enum([
    "planning",
    "waiting_approval",
    "resuming",
    "completed",
    "rejected",
    "error",
]);

const envelopeFields = {
    id: z.number().int().positive(),
    runId: z.uuid(),
    timestamp: z.number().int().nonnegative(),
};

export const AgentStreamEventSchema = z.discriminatedUnion("type", [
    z.object({
        ...envelopeFields,
        type: z.literal("connected"),
        payload: z.object({
            threadId: z.uuid(),
            status: AgentRunStatusSchema,
        }).strict(),
    }).strict(),
    z.object({
        ...envelopeFields,
        type: z.literal("planning_started"),
        payload: z.object({}).strict(),
    }).strict(),
    z.object({
        ...envelopeFields,
        type: z.literal("model_delta"),
        payload: z.object({ text: z.string().min(1) }).strict(),
    }).strict(),
    z.object({
        ...envelopeFields,
        type: z.literal("plan_ready"),
        payload: z.object({ plan: AgentPlanSchema }).strict(),
    }).strict(),
    z.object({
        ...envelopeFields,
        type: z.literal("waiting_approval"),
        payload: z.object({ planId: z.string().min(1) }).strict(),
    }).strict(),
    z.object({
        ...envelopeFields,
        type: z.literal("approval_received"),
        payload: z.object({ approved: z.boolean() }).strict(),
    }).strict(),
    z.object({
        ...envelopeFields,
        type: z.literal("graph_resumed"),
        payload: z.object({}).strict(),
    }).strict(),
    z.object({
        ...envelopeFields,
        type: z.literal("graph_completed"),
        payload: z.object({
            status: z.literal("approved"),
            plan: AgentPlanSchema,
        }).strict(),
    }).strict(),
    z.object({
        ...envelopeFields,
        type: z.literal("run_rejected"),
        payload: z.object({ status: z.literal("rejected") }).strict(),
    }).strict(),
    z.object({
        ...envelopeFields,
        type: z.literal("run_error"),
        payload: z.object({
            code: z.enum([
                "PLANNER_ERROR",
                "PLAN_VALIDATION_ERROR",
                "GRAPH_ERROR",
                "RUN_EXPIRED",
            ]),
            message: z.string().min(1),
        }).strict(),
    }).strict(),
]);

export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;
export type AgentStreamEvent = z.infer<typeof AgentStreamEventSchema>;
export type AgentStreamEventType = AgentStreamEvent["type"];

export type AgentStreamEventInput = AgentStreamEvent extends infer Event
    ? Event extends AgentStreamEvent
        ? Omit<Event, "id" | "runId" | "timestamp">
        : never
    : never;

export interface CreateAgentRunResponse {
    runId: string;
    threadId: string;
}

export interface AgentRunApprovalResponse {
    runId: string;
    accepted: true;
}
