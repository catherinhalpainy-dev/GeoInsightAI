// 读取.env文件中的环境变量
import { error } from "console";
import "dotenv/config";
// express:node.js后端开发最经典框架之一
// 快速写HTTP后端服务器
// 封装好了：收到请求、识别url、识别GET/POST、解析JSON、发送响应
import express from "express"
import { ZAI_MODEL, zhipuClient } from "./llm/zhipuClient";


import {
    AgentPlanRequestSchema,
    AgentResumeRequestSchema,
} from "./agent/schemas";

import {
    createAgentPlan,
} from "./agent/planner";
import { resumeAgentWorkflow, startAgentWorkflow } from "./agent/graph";


// 创建一个express应用（/后端服务器对象）
const app = express();

// 读取环境变量
// 环境变量默认都是字符串
const PORT = Number(
    // ?? 空值合并运算符 左边有值-使用左边；左边为null/undefined -使用右边
    process.env.PORT ?? 8787,
);

// app.use() --给express安装“中间件”——中间处理步骤
// 什么是中间件？——请求过程中的处理函数
app.use(
    // 解析前端发来的JSON
    express.json({
        // 最大允许量
        limit: "2mb",
    })
);

// 定义一个HTTP API
// app.get("/api/health",handler); ——如果有人用GET请求访问/api/health，就执行handler函数 
// 注册一个get接口
//"/api/health" —— 路由路径
//  health —— 健康检查接口 检查服务器是否启动
app.get(
    "/api/health",
    (_request, response) => {
        // request:前端发来的请求
        // reponse:后端准备发给前端的响应
        // _request：该函数暂时不需要使用
        response.json(
            {
                ok: true,
                service: "geoinsight-agent",
            }
        );
    }
);

// 大模型连接测试
// POST：向服务器提交数据
// GET：获取数据
// 在Express中创建一个POST请求接口
app.post(
    "/api/agent/test",
    // 异步函数
    async (request, response) => {
        const message = request.body?.message;
        if (typeof message !== "string" ||
            message.trim() === ""
        ) {
            response.status(400).json({
                ok: false,
                error:
                    "message必须是非空字符串",
            });

            return;
        }
        // try:成功则正常执行；失败则catch
        try {
            // 给大模型发送一次聊天请求
            // await ：等待把结果返回，再执行下面的代码
            const completion = await zhipuClient.chat.completions.create({
                model: ZAI_MODEL,
                messages: [
                    {
                        // 给AI定义角色
                        role: "system",
                        content:
                            "你是GeoInsight AI的GIS数据分析助手，请简洁回答用户问题。",

                    },

                    {
                        // 用户真正的问题
                        role: "user",
                        content: message,
                    },
                ],
            });

            // AI回答的文本
            const assistantMessage = completion.choices[0]?.message.content;

            response.json({
                // 调用成功
                ok: true,
                model: ZAI_MODEL,
                message: assistantMessage ?? "",
            })

        } catch (error: unknown) {
            // 错误打印至终端
            console.error(
                "Zhipu API error:",
                error,
            );

            const errorMessage =
                error instanceof Error ?
                    error.message
                    : "调用智谱模型时发生未知错误";

            response.status(500).json({
                ok: false,

                error: errorMessage,
            });
        }
    },
);

// 接收前端请求\校验参数\调用createAgentPlan\把结果返回给前端
// POST 提交一段数据给服务器处理
app.post(
    "/api/agent/plan",
    // 异步等待
    async (
        request,
        response,
    ) => {
        const parsedRequest =
            // .safeParse 检查是否合乎规范
            AgentPlanRequestSchema
                .safeParse(
                    request.body,
                );


        if (
            !parsedRequest.success
        ) {
            response
                .status(400)
                .json({
                    ok: false,

                    error:
                        "Agent 请求参数不合法",

                    details:
                        parsedRequest.error
                            .flatten(),
                });

            return;
        }


        try {
            const plan =
                await createAgentPlan(
                    parsedRequest.data,
                );


            response.json({
                ok: true,
                plan,
            });
        } catch (
        error: unknown
        ) {
            console.error(
                "Agent planning error:",
                error,
            );


            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "生成 Agent 计划时发生未知错误";


            response
                .status(500)
                .json({
                    ok: false,

                    error:
                        errorMessage,
                });
        }
    },
);

app.post(
    "/api/agent/start",
    async (request, response) => {
        const parsedRequest =
            AgentPlanRequestSchema
                .safeParse(
                    request.body,
                );


        if (
            !parsedRequest.success
        ) {
            response
                .status(400)
                .json({
                    ok: false,

                    error:
                        "Agent 请求参数不合法",

                    details:
                        parsedRequest
                            .error
                            .flatten(),
                });

            return;
        }
        try {
            const result =
                await startAgentWorkflow(
                    parsedRequest
                        .data
                        .message,

                    parsedRequest
                        .data
                        .context,
                );


            response.json({
                ok: true,

                ...result,
            });
        } catch (
        error: unknown
        ) {
            console.error(
                "Agent workflow start error:",
                error,
            );


            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "启动 Agent 工作流时发生未知错误";


            response
                .status(500)
                .json({
                    ok: false,

                    error:
                        errorMessage,
                });
        }
    }
);

app.post(
    "/api/agent/resume",

    async (
        request,
        response,
    ) => {
        const parsedRequest =
            AgentResumeRequestSchema
                .safeParse(
                    request.body,
                );


        if (
            !parsedRequest.success
        ) {
            response
                .status(400)
                .json({
                    ok: false,

                    error:
                        "Agent 恢复请求参数不合法",

                    details:
                        parsedRequest
                            .error
                            .flatten(),
                });

            return;
        }


        try {
            const result =
                await resumeAgentWorkflow(
                    parsedRequest
                        .data
                        .threadId,

                    parsedRequest
                        .data
                        .approved,
                );


            response.json({
                ok: true,

                ...result,
            });
        } catch (
        error: unknown
        ) {
            console.error(
                "Agent workflow resume error:",
                error,
            );


            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "恢复 Agent 工作流时发生未知错误";


            response
                .status(500)
                .json({
                    ok: false,

                    error:
                        errorMessage,
                });
        }
    },
);

// 让服务器开始监听一个端口
app.listen(
    PORT,
    // 回调函数，当服务器开始监听后，执行该函数
    () => {
        console.log(
            `Agent server running on http://localhost:${PORT}`,
        );
    }
)