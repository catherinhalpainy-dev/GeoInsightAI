import { ZAI_MODEL, zhipuClient } from "../llm/zhipuClient";
import { AGENT_SYSTEM_PROMPT } from "./prompt";
import { AgentContext, AgentPlan, AgentPlanSchema } from "./schemas";
import { AGENT_PLAN_TOOL } from "./tools";

export interface CreateAgentPlanInput {
    message: string;

    context: AgentContext;
}

export async function createAgentPlan({ message, context }: CreateAgentPlanInput): Promise<AgentPlan> {
    const completion =
        await zhipuClient.chat.completions.create({
            model: ZAI_MODEL,
            messages: [
                {
                    role: "system",
                    content: AGENT_SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    // .stringify 将js对象转为json
                    content:
                        `当前GIS应用状态：
                    ${JSON.stringify(
                            context, null, 2,
                        )}
                    用户请求：
                    ${message}
                    如果用户请求设计GIS操作，请调用submit_gis_plan。`,
                },
            ],
            tools: [AGENT_PLAN_TOOL,],
            tool_choice: "auto",
        });
    // completion返回后拿assistantMessage
    const assistantMessage = completion.choices[0]?.message;

    if (!assistantMessage) {
        throw new Error(
            "智谱模型没有返回有效信息",
        );
    }

    // .find()寻找第一个满足条件的元素
    const toolCall =
        assistantMessage
            .tool_calls?.find(
                (call) => {
                    if (
                        call.type !==
                        "function"
                    ) {
                        return false;
                    }

                    return (
                        call.function.name ===
                        "submit_gis_plan"
                    );
                },
            );


    if (
        !toolCall ||
        toolCall.type !== "function"
    ) {
        return {
            summary:
                assistantMessage.content ??
                "当前请求不需要执行 GIS 操作。",

            requiresConfirmation:
                false,

            // 没有任何GIS操作
            commands: [],
        };
    }

    // let 允许变量稍后才赋值
    // unknown:模型产生的数据是外部不可信数据,不能相信它
    let parsedArguments:
        unknown;

    //1.语法层面判断大模型返回的是合法JSON 
    try {
        // .parse 将字符串转为js对象
        parsedArguments =
            JSON.parse(
                toolCall.function
                    .arguments,
            );
    } catch {
        throw new Error(
            "模型返回的工具参数不是合法 JSON",
        );
    }

    // 2.用zod检查生成数据是否为合法AgentPlanSchema
    const result =
        AgentPlanSchema.safeParse(
            parsedArguments,
        );


    if (!result.success) {
        // 给开发者调试
        console.error(
            "Agent plan validation failed:",
            result.error.flatten(),
        );

        throw new Error(
            "模型返回了不合法的 GIS 操作计划",
        );
    }


    /*
     * 后端再做一层安全修正：
     *
     * 只要包含修改型命令，
     * 就必须经过用户确认。
     */

    // 3.业务安全检查
    // mutation : 修改型操作
    const containsMutation =
        // .some() 数组中只要有一个符合就返回true
        result.data.commands.some(
            (command) => {
                return (
                    command.type ===
                    "apply_filter" ||
                    command.type ===
                    "clear_filters" ||
                    command.type ===
                    "update_layer_style"
                );
            },
        );


    return {
        ...result.data,

        requiresConfirmation:
            containsMutation
                ? true
                : result.data
                    .requiresConfirmation,
    };

}