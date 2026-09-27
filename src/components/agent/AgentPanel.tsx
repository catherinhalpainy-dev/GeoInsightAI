import { useEffect, useRef, useState, type FormEvent } from "react";

import {
    approveAgentRun,
    createAgentRun,
    rejectAgentRun,
    subscribeAgentRun,
    type AgentRunSubscription,
} from "../../services/agent/agentStream";
import { LAND_USE_LABELS } from "../../constants/landUse";
import {
    createAgentPlanWorkspaceSnapshot,
    isAgentPlanWorkspaceSnapshotCurrent,
} from "../../services/agent/agentWorkspaceSnapshot";
import {
    getAgentCommandPresentation,
    isParcelAgentPlan,
} from "../../services/agent/describeAgentCommand";
import type {
    AgentContext,
    AgentExecutionEvent,
    AgentPlan,
    AgentPlanExecutionResult,
    AgentPlanWorkspaceSnapshot,
} from "../../types/agent";
import type { AgentStreamEvent } from "../../types/agentStream";
import "../../styles/agent.css";

interface AgentPanelProps {
    context: AgentContext;
    onExecutePlan: (plan: AgentPlan) => AgentPlanExecutionResult | Promise<AgentPlanExecutionResult>;
    executionEvents: AgentExecutionEvent[];
    onClose: () => void;
    canUndo: boolean;
    onUndo: () => void;
    onOpenParcelAnalysis: () => void;
    onGenerateParcelReport: () => void;
    onSaveAsWorkflow: (plan: AgentPlan) => { success: boolean; message: string };
    onResetExecutionEvents: () => void;
}

type AgentUiStatus = "idle" | "planning" | "waiting_approval" | "executing" | "completed" | "failed" | "rejected" | "error";

interface ServerTimelineEvent {
    id: number;
    source: "server";
    status: "success" | "error";
    title: string;
    message: string;
    timestamp: number;
}

const SUGGESTIONS = [
    "全面分析当前地块",
    "查看当前地块的规划用途",
    "分析限制要素影响",
    "分析 500 米周边交通和水系",
];

function looksLikeParcelRequest(message: string) {
    const normalized = message.toLowerCase();
    return ["地块", "规划用途", "开发限制", "限制要素", "周边交通", "周边水系", "parcel"].some((keyword) => normalized.includes(keyword));
}

function availableSources(context: AgentContext) {
    return [
        context.parcelAnalysis.planningLayer,
        context.parcelAnalysis.restrictionLayer,
        context.parcelAnalysis.roadLayer,
        context.parcelAnalysis.waterLayer,
        context.parcelAnalysis.administrativeLayer,
    ].filter((layer) => layer.available && layer.name);
}

export function AgentPanel({
    context,
    onExecutePlan,
    executionEvents,
    onClose,
    canUndo,
    onUndo,
    onOpenParcelAnalysis,
    onGenerateParcelReport,
    onSaveAsWorkflow,
    onResetExecutionEvents,
}: AgentPanelProps) {
    const [message, setMessage] = useState("");
    const [lastSubmittedMessage, setLastSubmittedMessage] = useState("");
    const [status, setStatus] = useState<AgentUiStatus>("idle");
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [plan, setPlan] = useState<AgentPlan | null>(null);
    const [planSnapshot, setPlanSnapshot] = useState<AgentPlanWorkspaceSnapshot | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [latestEvents, setLatestEvents] = useState<AgentExecutionEvent[]>([]);
    const [stoppedAtStep, setStoppedAtStep] = useState<number | null>(null);
    const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
    const [streamingText, setStreamingText] = useState("");
    const [connectionState, setConnectionState] = useState<"connected" | "reconnecting">("connected");
    const [serverTimeline, setServerTimeline] = useState<ServerTimelineEvent[]>([]);
    const subscriptionRef = useRef<AgentRunSubscription | null>(null);
    const handledTerminalEventIdsRef = useRef(new Set<number>());
    const isBusy = status === "planning" || status === "waiting_approval" || status === "executing";
    const parcelPlan = plan
        ? plan.domain === "parcel-analysis" || isParcelAgentPlan(plan.commands)
        : false;
    const sources = availableSources(context);
    const sourceNames = sources.map((source) => source.name as string);
    const timelineEntries = [
        ...serverTimeline.map((event) => ({
            ...event,
            facts: undefined as string[] | undefined,
            finishedAt: event.timestamp,
            durationMs: undefined as number | undefined,
        })),
        ...executionEvents.map((event, index) => ({
            id: index,
            source: "workspace" as const,
            status: event.status,
            title: event.title,
            message: event.message,
            timestamp: event.timestamp,
            facts: event.facts,
            finishedAt: event.finishedAt,
            durationMs: event.durationMs,
        })),
    ].sort((left, right) => left.timestamp - right.timestamp);

    useEffect(() => {
        return () => subscriptionRef.current?.close();
    }, []);

    async function executeApprovedPlan(approvedPlan: AgentPlan) {
        setStatus("executing");
        try {
            const execution = await onExecutePlan(approvedPlan);
            setLatestEvents(execution.events);
            setStoppedAtStep(execution.stoppedAtStep);
            setStatus(execution.completed ? "completed" : "failed");
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "分析执行失败。");
            setStatus("error");
        }
    }

    async function requestPlan(requestMessage: string) {
        const trimmedMessage = requestMessage.trim();
        if (!trimmedMessage || isBusy) return;
        if (looksLikeParcelRequest(trimmedMessage) && !context.selectedFeature) {
            setErrorMessage("请先在地图、属性表或搜索结果中选择一个目标地块。");
            setStatus("error");
            return;
        }

        const snapshot = createAgentPlanWorkspaceSnapshot(context);
        setLastSubmittedMessage(trimmedMessage);
        setErrorMessage(null);
        setStoppedAtStep(null);
        setLatestEvents([]);
        setStatus("planning");
        setPlan(null);
        setWorkflowMessage(null);
        setStreamingText("");
        setServerTimeline([]);
        setConnectionState("connected");
        setActiveRunId(null);
        setPlanSnapshot(snapshot);
        onResetExecutionEvents();
        handledTerminalEventIdsRef.current.clear();
        subscriptionRef.current?.close();
        subscriptionRef.current = null;

        try {
            const run = await createAgentRun(trimmedMessage, context);
            setActiveRunId(run.runId);
            subscriptionRef.current = subscribeAgentRun(run.runId, {
                onEvent: handleStreamEvent,
                onConnectionChange: setConnectionState,
                onProtocolError: (message) => {
                    setErrorMessage(message);
                    setStatus("error");
                },
            });
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Agent 请求失败。");
            setStatus("error");
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void requestPlan(message);
    }

    async function handleDecision(approved: boolean) {
        if (!activeRunId || !plan || status !== "waiting_approval") return;
        if (approved && parcelPlan && planSnapshot && !isAgentPlanWorkspaceSnapshotCurrent(planSnapshot, context)) {
            setErrorMessage("目标地块或分析图层已发生变化，请重新生成分析计划。");
            setStatus("error");
            return;
        }

        setErrorMessage(null);
        try {
            if (approved) {
                await approveAgentRun(activeRunId);
            } else {
                await rejectAgentRun(activeRunId);
            }
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Agent 工作流恢复失败。");
            setStatus("error");
        }
    }

    function addServerTimelineEvent(
        event: AgentStreamEvent,
        title: string,
        message: string,
        eventStatus: "success" | "error" = "success",
    ) {
        setServerTimeline((previous) => previous.some((item) => item.id === event.id)
            ? previous
            : [...previous, {
                id: event.id,
                source: "server",
                status: eventStatus,
                title,
                message,
                timestamp: event.timestamp,
            }]);
    }

    function handleStreamEvent(event: AgentStreamEvent) {
        switch (event.type) {
            case "connected":
                setConnectionState("connected");
                break;
            case "planning_started":
                setStatus("planning");
                break;
            case "model_delta":
                setStreamingText((previous) => previous + event.payload.text);
                break;
            case "plan_ready":
                setPlan(event.payload.plan);
                addServerTimelineEvent(
                    event,
                    "分析计划生成",
                    `已生成 ${event.payload.plan.commands.length} 个受约束 GIS 步骤。`,
                );
                break;
            case "waiting_approval":
                setStatus("waiting_approval");
                break;
            case "approval_received":
                addServerTimelineEvent(
                    event,
                    event.payload.approved ? "用户已批准" : "用户已取消",
                    event.payload.approved
                        ? "LangGraph 将恢复同一运行线程。"
                        : "本次计划不会执行 GIS 命令。",
                );
                if (event.payload.approved) {
                    setStatus("executing");
                }
                break;
            case "graph_resumed":
                setStatus("executing");
                break;
            case "graph_completed":
                if (handledTerminalEventIdsRef.current.has(event.id)) {
                    break;
                }
                handledTerminalEventIdsRef.current.add(event.id);
                setPlan(event.payload.plan);
                if (event.payload.plan.commands.length === 0) {
                    setErrorMessage(event.payload.plan.summary);
                    setStatus("error");
                    break;
                }
                void executeApprovedPlan(event.payload.plan);
                break;
            case "run_rejected":
                addServerTimelineEvent(event, "计划已取消", "LangGraph 已结束，本地 GIS 执行未启动。");
                setStatus("rejected");
                break;
            case "run_error":
                addServerTimelineEvent(event, "Agent 运行失败", event.payload.message, "error");
                setErrorMessage(event.payload.message);
                setStatus("error");
                break;
        }
    }

    return (
        <aside className="agent-panel">
            <header className="agent-panel-header">
                <div className="agent-panel-title">
                    <span className="agent-badge">AI</span>
                    <div><h2>GIS / 地块分析助手</h2><p>自然语言规划，本地确定性空间计算</p></div>
                </div>
                <button type="button" className="agent-close-button" aria-label="关闭分析助手" onClick={onClose}>×</button>
            </header>

            <div className="agent-panel-body">
                <section className="agent-context-card">
                    <span>CURRENT TARGET</span>
                    <strong>{context.selectedFeature ? `地块 ${context.selectedFeature.id}` : "尚未选择目标地块"}</strong>
                    <small>{context.selectedFeature ? `${context.selectedFeature.landUseType ? LAND_USE_LABELS[context.selectedFeature.landUseType] : "未知用途"} · ${context.selectedFeature.areaM2.toLocaleString("zh-CN", { maximumFractionDigits: 0 })} m²` : "请先选择主数据集中的地块"}</small>
                    <small>可用数据：{sourceNames.length > 0 ? sourceNames.join("、") : "暂无已绑定业务图层"}</small>
                </section>

                <div className="agent-suggestions" aria-label="建议分析问题">
                    {SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" disabled={isBusy} onClick={() => setMessage(suggestion)}>{suggestion}</button>)}
                </div>

                <form className="agent-input-form" onSubmit={handleSubmit}>
                    <label htmlFor="agent-message">分析需求</label>
                    <textarea id="agent-message" value={message} disabled={isBusy} placeholder="例如：全面分析当前地块，并说明规划、限制和周边条件" onChange={(event) => setMessage(event.currentTarget.value)} />
                    <button type="submit" disabled={isBusy || message.trim() === ""}>{status === "planning" ? "正在生成计划..." : "生成分析计划"}</button>
                </form>

                {status === "planning" && <section className="agent-streaming-text" aria-live="polite"><strong>正在生成分析计划...</strong>{streamingText && <p>{streamingText}</p>}</section>}
                {isBusy && connectionState === "reconnecting" && <p className="agent-connection-status">SSE 连接暂时中断，正在重新连接…</p>}

                {errorMessage && <div className="agent-error" role="alert"><strong>无法继续</strong><p>{errorMessage}</p><div className="agent-error-actions">{lastSubmittedMessage && <button type="button" onClick={() => void requestPlan(lastSubmittedMessage)}>重新生成计划</button>}<button type="button" onClick={onOpenParcelAnalysis}>打开手动地块分析</button></div></div>}

                {plan && <section className="agent-plan">
                    <header><div><span>{parcelPlan ? "PARCEL ANALYSIS PLAN" : "AGENT PLAN"}</span><h3>{plan.summary}</h3></div><span className={`agent-risk ${status === "completed" ? "completed" : status === "failed" ? "failed" : plan.requiresConfirmation ? "mutation" : "safe"}`}>{status === "completed" ? "已完成" : status === "failed" ? "已停止" : plan.requiresConfirmation ? "待确认" : "只读"}</span></header>
                    {parcelPlan && <div className="agent-plan-sources"><strong>本次数据源</strong><span>目标：{planSnapshot?.targetFeatureId ?? "未选择"}</span>{sources.map((source) => <span key={source.id ?? source.name}>{source.name} · {source.featureCount} features</span>)}</div>}
                    <ol className="agent-command-list">{plan.commands.map((command, index) => {
                        const presentation = getAgentCommandPresentation(command, context);
                        return <li key={`${command.type}-${index}`}><span className="agent-command-index">{index + 1}</span><div><strong>{presentation.title}</strong><p>{presentation.description}</p>{presentation.metadata.length > 0 && <small>{presentation.metadata.join(" · ")}</small>}</div></li>;
                    })}</ol>
                    {status === "waiting_approval" && <footer className="agent-approval-actions"><button type="button" className="agent-reject-button" onClick={() => void handleDecision(false)}>取消</button><button type="button" className="agent-approve-button" onClick={() => void handleDecision(true)}>{parcelPlan ? "执行分析" : "批准执行"}</button></footer>}
                    {status === "executing" && <p className="agent-status">正在按顺序执行本地分析步骤…</p>}
                    {(status === "completed" || status === "failed") && <div className={`agent-result-card ${status === "failed" ? "failed" : ""}`}><div className="agent-result-main"><span className="agent-result-icon">{status === "completed" ? "✓" : "!"}</span><div><strong>{status === "completed" ? "分析计划执行完成" : `执行在步骤 ${(stoppedAtStep ?? 0) + 1} 停止`}</strong><p>已记录 {latestEvents.length} 条可核验执行结果。</p>{parcelPlan && latestEvents.flatMap((event) => event.facts ?? []).slice(-5).map((fact) => <small key={fact}>{fact}</small>)}</div></div><div className="agent-result-actions"><button type="button" className="agent-undo-button" disabled={!canUndo} onClick={onUndo}>撤销整个计划</button>{parcelPlan && status === "completed" && <><button type="button" className="agent-open-result-button" onClick={onOpenParcelAnalysis}>查看地块分析</button><button type="button" className="agent-open-result-button" onClick={onGenerateParcelReport}>生成分析报告</button></>}</div></div>}
                    {!parcelPlan && plan.commands.length > 0 && (status === "completed" || status === "failed") && <div className="agent-workflow-action"><button type="button" onClick={() => { const result = onSaveAsWorkflow(plan); setWorkflowMessage(result.message); }}>保存为工作流</button>{workflowMessage && <p>{workflowMessage}</p>}</div>}
                    {status === "rejected" && <p className="agent-rejected">已取消，本次计划未执行。</p>}
                </section>}

                {timelineEntries.length > 0 && <section className="agent-execution-log"><header><span>EXECUTION TIMELINE</span><strong>执行记录</strong></header><ol>{timelineEntries.map((event) => <li key={`${event.source}-${event.id}-${event.timestamp}`} className={event.status}><span className="agent-log-icon">{event.status === "success" ? "✓" : "×"}</span><div><strong>{event.title}</strong><p>{event.message}</p>{event.facts?.map((fact) => <small key={fact}>{fact}</small>)}<time>{event.source === "server" ? "SERVER" : "WORKSPACE"} · {new Date(event.finishedAt).toLocaleTimeString("zh-CN")}{event.durationMs === undefined ? "" : ` · ${event.durationMs} ms`}</time></div></li>)}</ol></section>}
            </div>
        </aside>
    );
}
