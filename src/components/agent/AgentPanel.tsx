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
    AgentPlan,
} from "../../types/agent";

import "../../styles/agent.css";


interface AgentPanelProps {
    context:
    AgentContext;

    onExecutePlan: (
        plan: AgentPlan,
    ) => void;

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
    | "rejected"
    | "error";


function getCommandTitle(
    command: AgentCommand,
) {
    switch (
    command.type
    ) {
        case "apply_filter":
            return "修改筛选条件";

        case "clear_filters":
            return "清除筛选";

        case "update_layer_style":
            return "修改图层样式";

        case "fit_map_bounds":
            return "缩放到数据范围";

        case "navigate_statistics":
            return "打开统计分析";
    }
}


function getCommandDescription(
    command: AgentCommand,
) {
    switch (
    command.type
    ) {
        case "apply_filter": {
            const parts:
                string[] = [];

            if (
                command.payload
                    .landUseTypes
                    ?.length
            ) {
                parts.push(
                    `用地类型：${command.payload.landUseTypes.join(
                        "、",
                    )}`,
                );
            }

            if (
                command.payload
                    .minimumBuiltYear !==
                undefined
            ) {
                parts.push(
                    `最小建成年份：${command.payload
                        .minimumBuiltYear ??
                    "不限"
                    }`,
                );
            }

            if (
                command.payload
                    .districtCode
            ) {
                parts.push(
                    `行政区：${command.payload.districtCode}`,
                );
            }

            return (
                parts.join("；") ||
                "更新当前筛选条件"
            );
        }


        case "clear_filters":
            return "恢复为未筛选状态";


        case "update_layer_style": {
            const parts:
                string[] = [];

            const payload =
                command.payload;

            if (
                payload.fillOpacity !==
                undefined
            ) {
                parts.push(
                    `填充透明度 ${Math.round(
                        payload.fillOpacity *
                        100,
                    )}%`,
                );
            }

            if (
                payload.fillColor
            ) {
                parts.push(
                    `填充颜色 ${payload.fillColor}`,
                );
            }

            if (
                payload.outlineColor
            ) {
                parts.push(
                    `边框颜色 ${payload.outlineColor}`,
                );
            }

            if (
                payload.outlineWidth !==
                undefined
            ) {
                parts.push(
                    `边框宽度 ${payload.outlineWidth}px`,
                );
            }

            if (
                payload.colorMode
            ) {
                parts.push(
                    payload.colorMode ===
                        "classified"
                        ? "分类色"
                        : "单一颜色",
                );
            }

            return (
                parts.join("；") ||
                "更新图层样式"
            );
        }


        case "fit_map_bounds":
            return "将地图定位到当前数据范围";


        case "navigate_statistics":
            return "跳转到统计分析页面";
    }
}


export function AgentPanel({
    context,
    onExecutePlan,
    onClose,
    canUndo,
    onUndo,
}: AgentPanelProps) {

    const [
        message,
        setMessage,
    ] = useState("");

    const [
        status,
        setStatus,
    ] =
        useState<AgentUiStatus>(
            "idle",
        );

    const [
        threadId,
        setThreadId,
    ] =
        useState<string | null>(
            null,
        );

    const [
        plan,
        setPlan,
    ] =
        useState<AgentPlan | null>(
            null,
        );

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState<string | null>(
            null,
        );


    const isBusy =
        status === "planning" ||
        status === "executing";


    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const trimmedMessage =
            message.trim();

        if (
            !trimmedMessage ||
            isBusy
        ) {
            return;
        }


        setErrorMessage(null);

        setStatus(
            "planning",
        );

        setPlan(null);

        setThreadId(null);


        try {
            const result =
                await startAgent(
                    trimmedMessage,
                    context,
                );


            setThreadId(
                result.threadId,
            );

            setPlan(
                result.plan,
            );


            /*
             * 不需要人工审批时，
             * Graph 已直接 approved。
             */

            if (
                result.status ===
                "approved"
            ) {
                onExecutePlan(
                    result.plan,
                );

                setStatus(
                    "completed",
                );

                return;
            }


            if (
                result.status ===
                "waiting_approval"
            ) {
                setStatus(
                    "waiting",
                );

                return;
            }


            setStatus(
                result.status ===
                    "rejected"
                    ? "rejected"
                    : "idle",
            );

        } catch (
        error: unknown
        ) {
            const text =
                error instanceof Error
                    ? error.message
                    : "Agent 请求失败";

            setErrorMessage(
                text,
            );

            setStatus(
                "error",
            );
        }
    }


    async function handleDecision(
        approved: boolean,
    ) {
        if (
            !threadId ||
            !plan ||
            isBusy
        ) {
            return;
        }


        setErrorMessage(null);

        setStatus(
            "executing",
        );


        try {
            const result =
                await resumeAgent(
                    threadId,
                    approved,
                );


            if (
                result.status ===
                "approved"
            ) {
                onExecutePlan(
                    result.plan,
                );

                setStatus(
                    "completed",
                );

                return;
            }


            if (
                result.status ===
                "rejected"
            ) {
                setStatus(
                    "rejected",
                );

                return;
            }


            setStatus(
                "idle",
            );

        } catch (
        error: unknown
        ) {
            const text =
                error instanceof Error
                    ? error.message
                    : "Agent 工作流恢复失败";

            setErrorMessage(
                text,
            );

            setStatus(
                "error",
            );
        }
    }

    function getExecutionSummary(plan:AgentPlan){
        if(plan.commands.length===0){
            return "本次未执行应用操作";
        }
        return`已完成${plan.commands.length}个GIS操作`;
    }
    return (
        <aside className="agent-panel">
            <header className="agent-panel-header">
                <div className="agent-panel-title">
                    <span className="agent-badge">
                        AI
                    </span>

                    <div>
                        <h2>
                            GeoInsight Agent
                        </h2>

                        <p>
                            结构化设计模式
                        </p>
                    </div>
                </div>

                <button type="button" className="agent-close-button" aria-label="关闭 Agent" onClick={onClose}>
                    ×
                </button>
            </header>


            <div className="agent-panel-body">
                <section className="agent-context-card">
                    <span>
                        当前上下文
                    </span>

                    <strong>
                        {
                            context
                                .datasetName
                        }
                    </strong>

                    <small>
                        {
                            context
                                .featureCount
                        }{" "}
                        条要素
                    </small>
                </section>


                <form
                    className="agent-input-form"
                    onSubmit={
                        handleSubmit
                    }
                >
                    <label htmlFor="agent-message">
                        分析需求
                    </label>

                    <textarea
                        id="agent-message"
                        value={message}
                        disabled={
                            isBusy
                        }
                        placeholder="例如：筛选2010年以后工业用地，并把地图改成高对比样式"
                        onChange={(
                            event,
                        ) => {
                            setMessage(
                                event
                                    .currentTarget
                                    .value,
                            );
                        }}
                    />

                    <button
                        type="submit"
                        disabled={
                            isBusy ||
                            message.trim() ===
                            ""
                        }
                    >
                        {status ===
                            "planning"
                            ? "正在生成计划..."
                            : "让 Agent 分析"}
                    </button>
                </form>


                {errorMessage && (
                    <div className="agent-error">
                        <strong>
                            Agent 执行失败
                        </strong>

                        <p>
                            {errorMessage}
                        </p>
                    </div>
                )}


                {plan && (
                    <section className="agent-plan">
                        <header>
                            <div>
                                <span>
                                    操作计划
                                </span>

                                <h3>
                                    {plan.summary}
                                </h3>
                            </div>

                            <span
                                className={
                                    plan
                                        .requiresConfirmation
                                        ? "agent-risk mutation"
                                        : "agent-risk safe"
                                }
                            >
                                {plan
                                    .requiresConfirmation
                                    ? "需要确认"
                                    : "安全操作"}
                            </span>
                        </header>


                        <ol className="agent-command-list">
                            {plan.commands.map(
                                (
                                    command,
                                    index,
                                ) => {
                                    return (
                                        <li
                                            key={`${command.type}-${index}`}
                                        >
                                            <span className="agent-command-index">
                                                {index +
                                                    1}
                                            </span>

                                            <div>
                                                <strong>
                                                    {getCommandTitle(
                                                        command,
                                                    )}
                                                </strong>

                                                <p>
                                                    {getCommandDescription(
                                                        command,
                                                    )}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                },
                            )}
                        </ol>


                        {status ===
                            "waiting" && (
                                <footer className="agent-approval-actions">
                                    <button
                                        type="button"
                                        className="agent-reject-button"
                                        onClick={() => {
                                            void handleDecision(
                                                false,
                                            );
                                        }}
                                    >
                                        取消
                                    </button>

                                    <button
                                        type="button"
                                        className="agent-approve-button"
                                        onClick={() => {
                                            void handleDecision(
                                                true,
                                            );
                                        }}
                                    >
                                        确认执行
                                    </button>
                                </footer>
                            )}


                        {status ===
                            "executing" && (
                                <p className="agent-status">
                                    正在恢复 Agent
                                    工作流……
                                </p>
                            )}


                        {status ===
                            "completed" && (
                                <div className="agent-result-actions">
                                    <p className="agent-success">
                                        ✓ 操作已通过审批并交给应用执行
                                    </p>
                                    <p className="agent-sucess">
                                         ✓{getExecutionSummary(plan)}
                                    </p>
                                    <button
                                    type="button"
                                    disabled={!canUndo}
                                    onClick={onUndo}
                                    >
                                        撤销本次操作
                                    </button>
                                </div>

                            )}


                        {status ===
                            "rejected" && (
                                <p className="agent-rejected">
                                    已取消本次操作
                                </p>
                            )}


                    </section>
                )}
            </div>
        </aside>
    );
}