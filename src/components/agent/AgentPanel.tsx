import {
    useState,
    type FormEvent,
} from "react";

import {
    resumeAgent,
    startAgent,
} from "../../agent/agentClient";
import type {
    AgentCommand,
    AgentContext,
    AgentExecutionEvent,
    AgentPlan,
    AgentPlanExecutionResult,
} from "../../types/agent";
import "../../styles/agent.css";

interface AgentPanelProps {
    context: AgentContext;
    onExecutePlan: (
        plan: AgentPlan,
    ) => AgentPlanExecutionResult | Promise<AgentPlanExecutionResult>;
    executionEvents: AgentExecutionEvent[];
    onClose: () => void;
    canUndo: boolean;
    onUndo: () => void;
}

type AgentUiStatus =
    | "idle"
    | "planning"
    | "waiting"
    | "executing"
    | "completed"
    | "failed"
    | "rejected"
    | "error";

const LAND_USE_LABELS = {
    residential: "居住用地",
    commercial: "商业用地",
    industrial: "工业用地",
    green: "绿地",
    public: "公共设施",
    transportation: "交通用地",
    other: "其他",
} as const;

function getInputLabel(
    inputSource: Extract<
        AgentCommand,
        { type: "run_geoprocessing" }
    >["payload"]["inputSource"],
) {
    switch (inputSource) {
        case "filtered":
            return "当前筛选结果";
        case "aoi-query":
            return "AOI 查询结果";
        case "buffer-query":
            return "Buffer 查询结果";
    }
}

function getCommandTitle(
    command: AgentCommand,
) {
    switch (command.type) {
        case "apply_filter":
            return "应用属性筛选";
        case "clear_filters":
            return "清除属性筛选";
        case "update_layer_style":
            return "更新图层样式";
        case "fit_map_bounds":
            return "定位当前数据";
        case "navigate_statistics":
            return "打开统计分析";
        case "create_buffer":
            return "缓冲区分析";
        case "query_buffer":
            return "Buffer 范围查询";
        case "query_aoi":
            return "AOI 范围查询";
        case "run_geoprocessing":
            switch (command.payload.operation) {
                case "intersection":
                    return "叠加求交";
                case "dissolve":
                    return "融合处理";
                case "centroid":
                    return "中心点生成";
            }
        case "update_symbology":
            return "专题制图";
        case "set_analysis_layer_visibility":
            return "分析图层可见性";
    }
}

function getExecutionCommandTitle(
    commandType: AgentCommand["type"],
) {
    const labels: Record<
        AgentCommand["type"],
        string
    > = {
        apply_filter: "属性筛选",
        clear_filters: "清除筛选",
        update_layer_style: "图层样式",
        fit_map_bounds: "地图定位",
        navigate_statistics: "页面导航",
        create_buffer: "缓冲区分析",
        query_buffer: "Buffer 空间查询",
        query_aoi: "AOI 空间查询",
        run_geoprocessing: "地理处理",
        update_symbology: "专题制图",
        set_analysis_layer_visibility: "分析图层可见性",
    };

    return labels[commandType];
}

function getCommandDescription(
    command: AgentCommand,
    context: AgentContext,
) {
    switch (command.type) {
        case "apply_filter": {
            const parts: string[] = [];

            if (command.payload.landUseTypes?.length) {
                parts.push(
                    `用地类型：${command.payload.landUseTypes
                        .map((type) => LAND_USE_LABELS[type])
                        .join("、")}`,
                );
            }
            if (command.payload.minimumBuiltYear !== undefined) {
                parts.push(
                    `最小建成年份：${command.payload.minimumBuiltYear ?? "不限"}`,
                );
            }
            if (command.payload.districtCode) {
                parts.push(`行政区代码：${command.payload.districtCode}`);
            }

            return parts.join(" · ") || "更新当前筛选条件";
        }

        case "clear_filters":
            return "恢复为未筛选状态";

        case "update_layer_style": {
            const parts: string[] = [];
            const payload = command.payload;

            if (payload.fillOpacity !== undefined) {
                parts.push(`填充透明度 ${Math.round(payload.fillOpacity * 100)}%`);
            }
            if (payload.fillColor) {
                parts.push(`填充 ${payload.fillColor}`);
            }
            if (payload.outlineColor) {
                parts.push(`边框 ${payload.outlineColor}`);
            }
            if (payload.outlineWidth !== undefined) {
                parts.push(`边框宽度 ${payload.outlineWidth}px`);
            }
            if (payload.colorMode) {
                parts.push(
                    payload.colorMode === "classified"
                        ? "唯一值"
                        : "单一符号",
                );
            }

            return parts.join(" · ") || "更新土地利用图层样式";
        }

        case "fit_map_bounds":
            return `定位 ${context.filteredFeatureCount} 个当前要素`;

        case "navigate_statistics":
            return "跳转到统计分析页面";

        case "create_buffer":
            return `距离：${command.distanceM.toLocaleString("zh-CN")} m`;

        case "query_buffer":
            return "关系：相交 Intersects · 数据：当前筛选结果";

        case "query_aoi":
            return `关系：${command.relation === "within" ? "完全位于 Within" : "相交 Intersects"} · 数据：当前筛选结果`;

        case "run_geoprocessing": {
            const inputLabel = getInputLabel(
                command.payload.inputSource,
            );
            const inputCount =
                command.payload.inputSource === "filtered"
                    ? context.filteredFeatureCount
                    : command.payload.inputSource === "aoi-query"
                        ? context.aoiQueryFeatureCount
                        : context.bufferQueryFeatureCount;

            if (command.payload.operation === "intersection") {
                return `输入：${inputLabel} · ${inputCount} 个要素 · 范围：${command.payload.overlaySource === "aoi" ? "AOI" : "Buffer"}`;
            }
            if (command.payload.operation === "dissolve") {
                return `输入：${inputLabel} · 融合字段：${command.payload.dissolveField === "all" ? "全部" : "用地类型"}`;
            }
            return `输入：${inputLabel} · 预计 ${inputCount} 个点`;
        }

        case "update_symbology":
            if (command.payload.mode === "single") {
                return "渲染方式：单一符号";
            }
            if (command.payload.mode === "categorized") {
                return "渲染方式：唯一值 · 字段：用地类型";
            }
            return [
                `字段：${command.payload.field === "areaM2" ? "面积" : "建成年份"}`,
                `方法：${command.payload.method === "equalInterval" ? "等距" : "分位数"}`,
                `级数：${command.payload.classCount}`,
                `色带：${command.payload.colorRamp}`,
            ].join(" · ");

        case "set_analysis_layer_visibility": {
            const layer = context.analysisLayers.find(
                (item) => item.id === command.layerId,
            );
            return `${command.visible ? "显示" : "隐藏"}：${layer?.name ?? command.layerId}`;
        }
    }
}

export function AgentPanel({
    context,
    onExecutePlan,
    executionEvents,
    onClose,
    canUndo,
    onUndo,
}: AgentPanelProps) {
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<AgentUiStatus>("idle");
    const [threadId, setThreadId] = useState<string | null>(null);
    const [plan, setPlan] = useState<AgentPlan | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [latestExecutionEvents, setLatestExecutionEvents] =
        useState<AgentExecutionEvent[]>([]);
    const [stoppedAtStep, setStoppedAtStep] =
        useState<number | null>(null);

    const isBusy =
        status === "planning" || status === "executing";

    async function executeApprovedPlan(
        approvedPlan: AgentPlan,
    ) {
        setStatus("executing");
        const execution = await onExecutePlan(approvedPlan);

        setLatestExecutionEvents(execution.events);
        setStoppedAtStep(execution.stoppedAtStep);
        setStatus(execution.completed ? "completed" : "failed");
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        const trimmedMessage = message.trim();

        if (!trimmedMessage || isBusy) {
            return;
        }

        setErrorMessage(null);
        setStoppedAtStep(null);
        setLatestExecutionEvents([]);
        setStatus("planning");
        setPlan(null);
        setThreadId(null);

        try {
            const result = await startAgent(
                trimmedMessage,
                context,
            );

            setThreadId(result.threadId);
            setPlan(result.plan);

            if (result.status === "approved") {
                await executeApprovedPlan(result.plan);
                return;
            }

            if (result.status === "waiting_approval") {
                setStatus("waiting");
                return;
            }

            setStatus(
                result.status === "rejected"
                    ? "rejected"
                    : "idle",
            );
        } catch (error: unknown) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Agent 请求失败。",
            );
            setStatus("error");
        }
    }

    async function handleDecision(
        approved: boolean,
    ) {
        if (!threadId || !plan || isBusy) {
            return;
        }

        setErrorMessage(null);
        setStatus("executing");

        try {
            const result = await resumeAgent(
                threadId,
                approved,
            );

            if (result.status === "approved") {
                await executeApprovedPlan(result.plan);
                return;
            }

            if (result.status === "rejected") {
                setStatus("rejected");
                return;
            }

            setStatus("idle");
        } catch (error: unknown) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Agent 工作流恢复失败。",
            );
            setStatus("error");
        }
    }

    return (
        <aside className="agent-panel">
            <header className="agent-panel-header">
                <div className="agent-panel-title">
                    <span className="agent-badge">AI</span>
                    <div>
                        <h2>GeoInsight Agent</h2>
                        <p>GIS 结构化规划与确定性执行</p>
                    </div>
                </div>
                <button
                    type="button"
                    className="agent-close-button"
                    aria-label="关闭 Agent"
                    onClick={onClose}
                >
                    ×
                </button>
            </header>

            <div className="agent-panel-body">
                <section className="agent-context-card">
                    <span>CURRENT CONTEXT</span>
                    <strong>{context.datasetName}</strong>
                    <small>
                        当前 {context.filteredFeatureCount} / {context.featureCount} 个要素
                        {context.selectedFeature ? " · 已选择地块" : " · 未选择地块"}
                        {context.hasAoi ? " · AOI 已就绪" : ""}
                    </small>
                </section>

                <form className="agent-input-form" onSubmit={handleSubmit}>
                    <label htmlFor="agent-message">分析需求</label>
                    <textarea
                        id="agent-message"
                        value={message}
                        disabled={isBusy}
                        placeholder="例如：给当前地块创建 500 米缓冲区，并查询范围内的地块"
                        onChange={(event) => {
                            setMessage(event.currentTarget.value);
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isBusy || message.trim() === ""}
                    >
                        {status === "planning"
                            ? "正在生成计划..."
                            : "让 Agent 规划"}
                    </button>
                </form>

                {errorMessage && (
                    <div className="agent-error" role="alert">
                        <strong>Agent 执行失败</strong>
                        <p>{errorMessage}</p>
                    </div>
                )}

                {plan && (
                    <section className="agent-plan">
                        <header>
                            <div>
                                <span>AGENT PLAN</span>
                                <h3>{plan.summary}</h3>
                            </div>
                            <span
                                className={[
                                    "agent-risk",
                                    status === "completed"
                                        ? "completed"
                                        : status === "failed"
                                            ? "failed"
                                            : plan.requiresConfirmation
                                                ? "mutation"
                                                : "safe",
                                ].join(" ")}
                            >
                                {status === "completed"
                                    ? "已执行"
                                    : status === "failed"
                                        ? "已停止"
                                        : plan.requiresConfirmation
                                            ? "需要确认"
                                            : "无需修改"}
                            </span>
                        </header>

                        <ol className="agent-command-list">
                            {plan.commands.map((command, index) => (
                                <li key={`${command.type}-${index}`}>
                                    <span className="agent-command-index">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <strong>{getCommandTitle(command)}</strong>
                                        <p>{getCommandDescription(command, context)}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>

                        {status === "waiting" && (
                            <footer className="agent-approval-actions">
                                <button
                                    type="button"
                                    className="agent-reject-button"
                                    onClick={() => {
                                        void handleDecision(false);
                                    }}
                                >
                                    拒绝
                                </button>
                                <button
                                    type="button"
                                    className="agent-approve-button"
                                    onClick={() => {
                                        void handleDecision(true);
                                    }}
                                >
                                    批准执行
                                </button>
                            </footer>
                        )}

                        {status === "executing" && (
                            <p className="agent-status">
                                正在按顺序执行 GIS 命令…
                            </p>
                        )}

                        {(status === "completed" || status === "failed") && (
                            <div
                                className={[
                                    "agent-result-card",
                                    status === "failed" ? "failed" : "",
                                ].filter(Boolean).join(" ")}
                            >
                                <div className="agent-result-main">
                                    <span className="agent-result-icon">
                                        {status === "completed" ? "✓" : "!"}
                                    </span>
                                    <div>
                                        <strong>
                                            {status === "completed"
                                                ? "计划执行完成"
                                                : `执行在步骤 ${(stoppedAtStep ?? 0) + 1} 停止`}
                                        </strong>
                                        <p>
                                            {plan.commands.length === 0
                                                ? "本次没有需要执行的应用操作。"
                                                : `已记录 ${latestExecutionEvents.length} 条执行结果。`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="agent-undo-button"
                                    disabled={!canUndo}
                                    onClick={onUndo}
                                >
                                    撤销整个计划
                                </button>
                            </div>
                        )}

                        {status === "rejected" && (
                            <p className="agent-rejected">
                                已拒绝，本次计划未执行。
                            </p>
                        )}
                    </section>
                )}

                {executionEvents.length > 0 && (
                    <section className="agent-execution-log">
                        <header>
                            <span>EXECUTION LOG</span>
                            <strong>执行记录</strong>
                        </header>
                        <ol>
                            {executionEvents.map((event, index) => (
                                <li
                                    key={`${event.timestamp}-${event.commandType}-${index}`}
                                    className={event.status}
                                >
                                    <span className="agent-log-icon">
                                        {event.status === "success" ? "✓" : "×"}
                                    </span>
                                    <div>
                                        <strong>
                                            {getExecutionCommandTitle(
                                                event.commandType,
                                            )}
                                        </strong>
                                        <p>{event.message}</p>
                                        <time>
                                            {new Date(event.timestamp).toLocaleTimeString(
                                                "zh-CN",
                                                {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    second: "2-digit",
                                                },
                                            )}
                                        </time>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}
            </div>
        </aside>
    );
}
