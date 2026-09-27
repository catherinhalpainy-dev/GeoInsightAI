import { resumeAgentWorkflow, startAgentWorkflow } from "./graph";
import { AgentPlanValidationError } from "./planner";
import {
    agentRunManager,
    type AgentRunRuntime,
} from "./runManager";
import type { AgentContext, AgentPlan } from "./schemas";

function failRun(
    runtime: AgentRunRuntime,
    code: "PLANNER_ERROR" | "PLAN_VALIDATION_ERROR" | "GRAPH_ERROR",
    message: string,
    error: unknown,
) {
    console.error(`Agent run ${runtime.runId} failed:`, error);
    runtime.status = "error";
    agentRunManager.emit(runtime, {
        type: "run_error",
        payload: { code, message },
    });
}

export async function startAgentRun(
    runtime: AgentRunRuntime,
    message: string,
    context: AgentContext,
) {
    agentRunManager.emit(runtime, {
        type: "planning_started",
        payload: {},
    });

    try {
        const result = await startAgentWorkflow(message, context, {
            threadId: runtime.threadId,
            signal: runtime.abortController.signal,
            onModelDelta: (text) => {
                agentRunManager.emit(runtime, {
                    type: "model_delta",
                    payload: { text },
                });
            },
        });

        if (!result.plan) {
            throw new Error("LangGraph 未返回 AgentPlan。 ");
        }

        runtime.graphResult = {
            plan: result.plan,
            interrupt: result.interrupt,
            interruptId: result.interruptId,
        };
        agentRunManager.emit(runtime, {
            type: "plan_ready",
            payload: { plan: result.plan },
        });

        if (result.status === "waiting_approval") {
            runtime.status = "waiting_approval";
            agentRunManager.emit(runtime, {
                type: "waiting_approval",
                payload: { planId: runtime.runId },
            });
            return;
        }

        if (result.status === "approved") {
            completeApprovedRun(runtime, result.plan);
            return;
        }

        runtime.status = "rejected";
        agentRunManager.emit(runtime, {
            type: "run_rejected",
            payload: { status: "rejected" },
        });
    } catch (error: unknown) {
        if (error instanceof AgentPlanValidationError) {
            failRun(
                runtime,
                "PLAN_VALIDATION_ERROR",
                "模型生成的分析计划未通过安全校验，请重新生成。",
                error,
            );
            return;
        }
        failRun(
            runtime,
            "PLANNER_ERROR",
            "分析计划生成失败，请稍后重试。",
            error,
        );
    }
}

function completeApprovedRun(runtime: AgentRunRuntime, plan: AgentPlan) {
    runtime.status = "completed";
    agentRunManager.emit(runtime, {
        type: "graph_completed",
        payload: { status: "approved", plan },
    });
}

export function submitAgentApproval(runtime: AgentRunRuntime, approved: boolean) {
    if (runtime.status !== "waiting_approval") {
        return false;
    }

    runtime.status = "resuming";
    runtime.approval = approved;
    agentRunManager.emit(runtime, {
        type: "approval_received",
        payload: { approved },
    });
    if (approved) {
        agentRunManager.emit(runtime, {
            type: "graph_resumed",
            payload: {},
        });
    }

    void resumeAgentRun(runtime, approved);
    return true;
}

async function resumeAgentRun(runtime: AgentRunRuntime, approved: boolean) {
    try {
        const result = await resumeAgentWorkflow(
            runtime.threadId,
            approved,
            runtime.graphResult?.interruptId ?? null,
        );
        if (!result.plan) {
            throw new Error("LangGraph 恢复后未返回 AgentPlan。");
        }

        runtime.graphResult = {
            plan: result.plan,
            interrupt: result.interrupt,
            interruptId: result.interruptId,
        };

        if (result.status === "approved") {
            completeApprovedRun(runtime, result.plan);
            return;
        }

        if (result.status === "rejected") {
            runtime.status = "rejected";
            agentRunManager.emit(runtime, {
                type: "run_rejected",
                payload: { status: "rejected" },
            });
            return;
        }

        throw new Error(`LangGraph 恢复后进入了意外状态：${result.status}`);
    } catch (error: unknown) {
        failRun(
            runtime,
            "GRAPH_ERROR",
            "Agent 工作流恢复失败，请重新生成分析计划。",
            error,
        );
    }
}
