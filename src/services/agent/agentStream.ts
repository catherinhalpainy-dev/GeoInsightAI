import { z } from "zod";

import type { AgentContext } from "../../types/agent";
import {
    AgentStreamEventSchema,
    type AgentRunApprovalResponse,
    type AgentStreamEvent,
    type AgentStreamEventType,
    type CreateAgentRunResponse,
} from "../../types/agentStream";

const AGENT_REQUEST_TIMEOUT_MS = 30_000;

const CreateAgentRunResponseSchema = z.object({
    runId: z.uuid(),
    threadId: z.uuid(),
}).strict();

const AgentRunApprovalResponseSchema = z.object({
    runId: z.uuid(),
    accepted: z.literal(true),
}).strict();

const EVENT_TYPES: AgentStreamEventType[] = [
    "connected",
    "planning_started",
    "model_delta",
    "plan_ready",
    "waiting_approval",
    "approval_received",
    "graph_resumed",
    "graph_completed",
    "run_rejected",
    "run_error",
];

async function readErrorMessage(response: Response): Promise<string> {
    try {
        const data: unknown = await response.json();
        const parsed = z.object({ error: z.string().optional() }).passthrough().safeParse(data);
        return parsed.success && parsed.data.error
            ? parsed.data.error
            : `请求失败（${response.status}）`;
    } catch {
        return `请求失败（${response.status}）`;
    }
}

async function postJson(url: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        AGENT_REQUEST_TIMEOUT_MS,
    );
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }
        return await response.json();
    } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error("Agent 请求超时，请稍后重试。");
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("无法连接 GeoInsight Agent 服务。手动地块分析仍可正常使用。");
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export async function createAgentRun(
    message: string,
    context: AgentContext,
): Promise<CreateAgentRunResponse> {
    const data = await postJson("/api/agent/runs", { message, context });
    return CreateAgentRunResponseSchema.parse(data);
}

export async function approveAgentRun(
    runId: string,
): Promise<AgentRunApprovalResponse> {
    return submitAgentApproval(runId, true);
}

export async function rejectAgentRun(
    runId: string,
): Promise<AgentRunApprovalResponse> {
    return submitAgentApproval(runId, false);
}

async function submitAgentApproval(
    runId: string,
    approved: boolean,
): Promise<AgentRunApprovalResponse> {
    const data = await postJson(
        `/api/agent/runs/${encodeURIComponent(runId)}/approval`,
        { approved },
    );
    return AgentRunApprovalResponseSchema.parse(data);
}

export interface AgentRunSubscription {
    close: () => void;
}

interface SubscribeAgentRunOptions {
    onEvent: (event: AgentStreamEvent) => void;
    onConnectionChange?: (state: "connected" | "reconnecting") => void;
    onProtocolError?: (message: string) => void;
}

export function subscribeAgentRun(
    runId: string,
    options: SubscribeAgentRunOptions,
): AgentRunSubscription {
    const source = new EventSource(
        `/api/agent/runs/${encodeURIComponent(runId)}/events`,
    );

    source.onopen = () => options.onConnectionChange?.("connected");
    source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) {
            options.onProtocolError?.(
                "Agent 运行已失效，请重新生成分析计划。",
            );
            return;
        }
        options.onConnectionChange?.("reconnecting");
    };

    for (const eventType of EVENT_TYPES) {
        source.addEventListener(eventType, (rawEvent) => {
            if (!(rawEvent instanceof MessageEvent)) {
                return;
            }

            let data: unknown;
            try {
                data = JSON.parse(rawEvent.data);
            } catch {
                source.close();
                options.onProtocolError?.("Agent 事件不是合法 JSON。 ");
                return;
            }

            const parsed = AgentStreamEventSchema.safeParse(data);
            if (!parsed.success || parsed.data.type !== eventType) {
                source.close();
                options.onProtocolError?.("Agent 事件未通过运行时校验。 ");
                return;
            }

            options.onEvent(parsed.data);
            if (
                parsed.data.type === "graph_completed" ||
                parsed.data.type === "run_rejected" ||
                parsed.data.type === "run_error"
            ) {
                source.close();
            }
        });
    }

    return { close: () => source.close() };
}
