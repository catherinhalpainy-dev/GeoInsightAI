import { ZAI_MODEL, zhipuClient } from "../llm/zhipuClient";
import { AGENT_SYSTEM_PROMPT } from "./prompt";
import {
    type AgentCommand,
    type AgentContext,
    type AgentPlan,
    AgentPlanSchema,
} from "./schemas";
import { AGENT_PLAN_TOOL } from "./tools";

export interface CreateAgentPlanInput {
    message: string;
    context: AgentContext;
}

function isMutationCommand(
    command: AgentCommand,
): boolean {
    return command.type !== "fit_map_bounds" &&
        command.type !== "navigate_statistics";
}

function getInputPreconditionError(
    inputSource:
        | "filtered"
        | "aoi-query"
        | "buffer-query",
    state: {
        filteredFeatureCount: number;
        hasAoiQueryResult: boolean;
        hasBufferQueryResult: boolean;
    },
): string | null {
    if (
        inputSource === "filtered" &&
        state.filteredFeatureCount === 0
    ) {
        return "当前筛选结果为空，无法运行地理处理。";
    }

    if (
        inputSource === "aoi-query" &&
        !state.hasAoiQueryResult
    ) {
        return "当前没有可用的 AOI 查询结果。";
    }

    if (
        inputSource === "buffer-query" &&
        !state.hasBufferQueryResult
    ) {
        return "当前没有可用的 Buffer 查询结果。";
    }

    return null;
}

function getPlanPreconditionError(
    commands: AgentCommand[],
    context: AgentContext,
): string | null {
    const state = {
        hasBuffer: context.hasBuffer,
        hasAoi: context.hasAoi && context.aoiCompleted,
        hasBufferQueryResult:
            context.bufferQueryFeatureCount > 0,
        hasAoiQueryResult:
            context.aoiQueryFeatureCount > 0,
        filteredFeatureCount:
            context.filteredFeatureCount,
    };
    const analysisLayerIds = new Set(
        context.analysisLayers.map((layer) => layer.id),
    );

    for (const command of commands) {
        switch (command.type) {
            case "apply_filter":
            case "clear_filters":
                // The exact post-filter count is calculated by the frontend.
                break;

            case "create_buffer":
                if (!context.selectedFeature) {
                    return "请先在地图中选择一个地块，再创建缓冲区。";
                }
                state.hasBuffer = true;
                state.hasBufferQueryResult = false;
                break;

            case "query_buffer":
                if (!state.hasBuffer) {
                    return "请先创建缓冲区，再查询缓冲范围内的地块。";
                }
                state.hasBufferQueryResult = true;
                break;

            case "query_aoi":
                if (!state.hasAoi) {
                    return "请先在地图中完成 AOI 绘制。";
                }
                state.hasAoiQueryResult = true;
                break;

            case "run_geoprocessing": {
                const inputError = getInputPreconditionError(
                    command.payload.inputSource,
                    state,
                );

                if (inputError) {
                    return inputError;
                }

                if (
                    command.payload.operation === "intersection" &&
                    command.payload.overlaySource === "aoi" &&
                    !state.hasAoi
                ) {
                    return "请先在地图中完成 AOI 绘制，再运行叠加求交。";
                }

                if (
                    command.payload.operation === "intersection" &&
                    command.payload.overlaySource === "buffer" &&
                    !state.hasBuffer
                ) {
                    return "请先创建缓冲区，再运行叠加求交。";
                }
                break;
            }

            case "set_analysis_layer_visibility":
                if (!analysisLayerIds.has(command.layerId)) {
                    return "计划引用了不存在的分析结果图层。";
                }
                break;

            case "update_layer_style":
            case "update_symbology":
            case "fit_map_bounds":
            case "navigate_statistics":
                break;
        }
    }

    return null;
}

function createUnavailablePlan(
    message: string,
): AgentPlan {
    return {
        summary: `当前无法执行：${message}`,
        requiresConfirmation: false,
        commands: [],
    };
}

export async function createAgentPlan({
    message,
    context,
}: CreateAgentPlanInput): Promise<AgentPlan> {
    const completion = await zhipuClient.chat.completions.create({
        model: ZAI_MODEL,
        messages: [
            {
                role: "system",
                content: AGENT_SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: [
                    "当前 GIS 应用状态摘要：",
                    JSON.stringify(context, null, 2),
                    "用户请求：",
                    message,
                    "请在可执行时调用 submit_gis_plan。",
                ].join("\n"),
            },
        ],
        tools: [AGENT_PLAN_TOOL],
        tool_choice: "auto",
    });
    const assistantMessage = completion.choices[0]?.message;

    if (!assistantMessage) {
        throw new Error("智谱模型没有返回有效信息。");
    }

    const toolCall = assistantMessage.tool_calls?.find(
        (call) =>
            call.type === "function" &&
            call.function.name === "submit_gis_plan",
    );

    if (!toolCall || toolCall.type !== "function") {
        return {
            summary:
                assistantMessage.content ??
                "当前请求不需要执行 GIS 操作。",
            requiresConfirmation: false,
            commands: [],
        };
    }

    let parsedArguments: unknown;

    try {
        parsedArguments = JSON.parse(
            toolCall.function.arguments,
        );
    } catch {
        throw new Error("模型返回的工具参数不是合法 JSON。");
    }

    const result = AgentPlanSchema.safeParse(parsedArguments);

    if (!result.success) {
        console.error(
            "Agent plan validation failed:",
            result.error.flatten(),
        );
        throw new Error("模型返回了不合法的 GIS 操作计划。");
    }

    const preconditionError = getPlanPreconditionError(
        result.data.commands,
        context,
    );

    if (preconditionError) {
        return createUnavailablePlan(preconditionError);
    }

    const containsMutation = result.data.commands.some(
        isMutationCommand,
    );

    return {
        ...result.data,
        requiresConfirmation:
            containsMutation || result.data.requiresConfirmation,
    };
}
