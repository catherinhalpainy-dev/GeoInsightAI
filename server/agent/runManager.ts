import { randomUUID } from "node:crypto";

import type { AgentPlan } from "./schemas";
import {
    AgentStreamEventSchema,
    type AgentRunStatus,
    type AgentStreamEvent,
    type AgentStreamEventInput,
} from "../../src/types/agentStream";

const MAX_BUFFERED_EVENTS = 200;
const TERMINAL_RUN_TTL_MS = 30 * 60 * 1_000;
const IDLE_RUN_TTL_MS = 60 * 60 * 1_000;

const TERMINAL_STATUSES = new Set<AgentRunStatus>([
    "completed",
    "rejected",
    "error",
]);

export interface AgentRunSubscriber {
    send: (event: AgentStreamEvent) => void;
    close: () => void;
}

export interface AgentRunRuntime {
    runId: string;
    threadId: string;
    createdAt: number;
    updatedAt: number;
    status: AgentRunStatus;
    events: AgentStreamEvent[];
    nextEventId: number;
    subscribers: Set<AgentRunSubscriber>;
    abortController: AbortController;
    graphResult: {
        plan: AgentPlan;
        interrupt: unknown | null;
        interruptId: string | null;
    } | null;
    approval: boolean | null;
}

/**
 * In-memory runtime is suitable for the current single-instance demo deployment.
 * Horizontal scaling would require an external event/state store.
 */
export class AgentRunManager {
    private readonly runs = new Map<string, AgentRunRuntime>();

    createRun(): AgentRunRuntime {
        this.cleanupExpiredRuns();

        const now = Date.now();
        const runtime: AgentRunRuntime = {
            runId: randomUUID(),
            threadId: randomUUID(),
            createdAt: now,
            updatedAt: now,
            status: "planning",
            events: [],
            nextEventId: 1,
            subscribers: new Set(),
            abortController: new AbortController(),
            graphResult: null,
            approval: null,
        };

        this.runs.set(runtime.runId, runtime);
        this.emit(runtime, {
            type: "connected",
            payload: {
                threadId: runtime.threadId,
                status: runtime.status,
            },
        });
        return runtime;
    }

    getRun(runId: string): AgentRunRuntime | undefined {
        this.cleanupExpiredRuns();
        return this.runs.get(runId);
    }

    emit(runtime: AgentRunRuntime, input: AgentStreamEventInput): AgentStreamEvent {
        const event = AgentStreamEventSchema.parse({
            id: runtime.nextEventId,
            runId: runtime.runId,
            timestamp: Date.now(),
            ...input,
        });

        runtime.nextEventId += 1;
        runtime.updatedAt = event.timestamp;
        runtime.events.push(event);
        if (runtime.events.length > MAX_BUFFERED_EVENTS) {
            runtime.events.splice(0, runtime.events.length - MAX_BUFFERED_EVENTS);
        }

        for (const subscriber of runtime.subscribers) {
            subscriber.send(event);
        }

        if (TERMINAL_STATUSES.has(runtime.status)) {
            for (const subscriber of runtime.subscribers) {
                subscriber.close();
            }
            runtime.subscribers.clear();
            this.cleanupExpiredRuns();
        }

        return event;
    }

    subscribe(
        runtime: AgentRunRuntime,
        lastEventId: number,
        subscriber: AgentRunSubscriber,
    ): { active: boolean; unsubscribe: () => void } {
        for (const event of runtime.events) {
            if (event.id > lastEventId) {
                subscriber.send(event);
            }
        }

        if (TERMINAL_STATUSES.has(runtime.status)) {
            subscriber.close();
            return { active: false, unsubscribe: () => undefined };
        }

        runtime.subscribers.add(subscriber);
        runtime.updatedAt = Date.now();
        return {
            active: true,
            unsubscribe: () => {
                runtime.subscribers.delete(subscriber);
                runtime.updatedAt = Date.now();
            },
        };
    }

    private cleanupExpiredRuns() {
        const now = Date.now();
        for (const [runId, runtime] of this.runs) {
            const ttl = TERMINAL_STATUSES.has(runtime.status)
                ? TERMINAL_RUN_TTL_MS
                : IDLE_RUN_TTL_MS;
            if (now - runtime.updatedAt <= ttl) {
                continue;
            }

            runtime.abortController.abort();
            for (const subscriber of runtime.subscribers) {
                subscriber.close();
            }
            runtime.subscribers.clear();
            this.runs.delete(runId);
        }
    }
}

export const agentRunManager = new AgentRunManager();
