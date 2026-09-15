import { useState, type FormEvent } from "react";

import { resumeAgent, startAgent } from "../../agent/agentClient";
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
import "../../styles/agent.css";

interface AgentPanelProps {
    context: AgentContext;
    onExecutePlan: (plan: AgentPlan) => AgentPlanExecutionResult | Promise<AgentPlanExecutionResult>;
    executionEvents: AgentExecutionEvent[];
    onClose: () => void;
    canUndo: boolean;
    onUndo: () => void;
    onOpenParcelAnalysis: () => void;
    onSaveAsWorkflow: (plan: AgentPlan) => { success: boolean; message: string };
}

type AgentUiStatus = "idle" | "planning" | "waiting" | "executing" | "completed" | "failed" | "rejected" | "error";

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
    onSaveAsWorkflow,
}: AgentPanelProps) {
    const [message, setMessage] = useState("");
    const [lastSubmittedMessage, setLastSubmittedMessage] = useState("");
    const [status, setStatus] = useState<AgentUiStatus>("idle");
    const [threadId, setThreadId] = useState<string | null>(null);
    const [plan, setPlan] = useState<AgentPlan | null>(null);
    const [planSnapshot, setPlanSnapshot] = useState<AgentPlanWorkspaceSnapshot | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [latestEvents, setLatestEvents] = useState<AgentExecutionEvent[]>([]);
    const [stoppedAtStep, setStoppedAtStep] = useState<number | null>(null);
    const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
    const isBusy = status === "planning" || status === "executing";
    const parcelPlan = plan
        ? plan.domain === "parcel-analysis" || isParcelAgentPlan(plan.commands)
        : false;
    const sources = availableSources(context);
    const sourceNames = sources.map((source) => source.name as string);

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
        setThreadId(null);

        try {
            const result = await startAgent(trimmedMessage, context);
            setThreadId(result.threadId);
            setPlan(result.plan);
            setPlanSnapshot(snapshot);
            if (result.plan.commands.length === 0) {
                setErrorMessage(result.plan.summary);
                setStatus("error");
                return;
            }
            if (result.status === "approved") {
                await executeApprovedPlan(result.plan);
            } else if (result.status === "waiting_approval") {
                setStatus("waiting");
            } else {
                setStatus(result.status === "rejected" ? "rejected" : "idle");
            }
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
        if (!threadId || !plan || isBusy) return;
        if (approved && parcelPlan && planSnapshot && !isAgentPlanWorkspaceSnapshotCurrent(planSnapshot, context)) {
            setErrorMessage("目标地块或分析图层已发生变化，请重新生成分析计划。");
            setStatus("error");
            return;
        }

        setErrorMessage(null);
        setStatus("executing");
        try {
            const result = await resumeAgent(threadId, approved);
            if (result.status === "approved") await executeApprovedPlan(result.plan);
            else if (result.status === "rejected") setStatus("rejected");
            else setStatus("idle");
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Agent 工作流恢复失败。");
            setStatus("error");
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

                {errorMessage && <div className="agent-error" role="alert"><strong>无法继续</strong><p>{errorMessage}</p><div className="agent-error-actions">{lastSubmittedMessage && <button type="button" onClick={() => void requestPlan(lastSubmittedMessage)}>重新生成计划</button>}<button type="button" onClick={onOpenParcelAnalysis}>打开手动地块分析</button></div></div>}

                {plan && <section className="agent-plan">
                    <header><div><span>{parcelPlan ? "PARCEL ANALYSIS PLAN" : "AGENT PLAN"}</span><h3>{plan.summary}</h3></div><span className={`agent-risk ${status === "completed" ? "completed" : status === "failed" ? "failed" : plan.requiresConfirmation ? "mutation" : "safe"}`}>{status === "completed" ? "已完成" : status === "failed" ? "已停止" : plan.requiresConfirmation ? "待确认" : "只读"}</span></header>
                    {parcelPlan && <div className="agent-plan-sources"><strong>本次数据源</strong><span>目标：{planSnapshot?.targetFeatureId ?? "未选择"}</span>{sources.map((source) => <span key={source.id ?? source.name}>{source.name} · {source.featureCount} features</span>)}</div>}
                    <ol className="agent-command-list">{plan.commands.map((command, index) => {
                        const presentation = getAgentCommandPresentation(command, context);
                        return <li key={`${command.type}-${index}`}><span className="agent-command-index">{index + 1}</span><div><strong>{presentation.title}</strong><p>{presentation.description}</p>{presentation.metadata.length > 0 && <small>{presentation.metadata.join(" · ")}</small>}</div></li>;
                    })}</ol>
                    {status === "waiting" && <footer className="agent-approval-actions"><button type="button" className="agent-reject-button" onClick={() => void handleDecision(false)}>取消</button><button type="button" className="agent-approve-button" onClick={() => void handleDecision(true)}>{parcelPlan ? "执行分析" : "批准执行"}</button></footer>}
                    {status === "executing" && <p className="agent-status">正在按顺序执行本地分析步骤…</p>}
                    {(status === "completed" || status === "failed") && <div className={`agent-result-card ${status === "failed" ? "failed" : ""}`}><div className="agent-result-main"><span className="agent-result-icon">{status === "completed" ? "✓" : "!"}</span><div><strong>{status === "completed" ? "分析计划执行完成" : `执行在步骤 ${(stoppedAtStep ?? 0) + 1} 停止`}</strong><p>已记录 {latestEvents.length} 条可核验执行结果。</p>{parcelPlan && latestEvents.flatMap((event) => event.facts ?? []).slice(-5).map((fact) => <small key={fact}>{fact}</small>)}</div></div><div className="agent-result-actions"><button type="button" className="agent-undo-button" disabled={!canUndo} onClick={onUndo}>撤销整个计划</button>{parcelPlan && status === "completed" && <button type="button" className="agent-open-result-button" onClick={onOpenParcelAnalysis}>查看地块分析</button>}</div></div>}
                    {!parcelPlan && plan.commands.length > 0 && (status === "completed" || status === "failed") && <div className="agent-workflow-action"><button type="button" onClick={() => { const result = onSaveAsWorkflow(plan); setWorkflowMessage(result.message); }}>保存为工作流</button>{workflowMessage && <p>{workflowMessage}</p>}</div>}
                    {status === "rejected" && <p className="agent-rejected">已取消，本次计划未执行。</p>}
                </section>}

                {executionEvents.length > 0 && <section className="agent-execution-log"><header><span>EXECUTION LOG</span><strong>执行记录</strong></header><ol>{executionEvents.map((event, index) => <li key={`${event.timestamp}-${event.commandType}-${index}`} className={event.status}><span className="agent-log-icon">{event.status === "success" ? "✓" : "×"}</span><div><strong>{event.title}</strong><p>{event.message}</p>{event.facts?.map((fact) => <small key={fact}>{fact}</small>)}<time>{new Date(event.finishedAt).toLocaleTimeString("zh-CN")} · {event.durationMs} ms</time></div></li>)}</ol></section>}
            </div>
        </aside>
    );
}
