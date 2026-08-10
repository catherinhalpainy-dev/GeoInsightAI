import OpenAI from "openai"

const apiKey =
    process.env.ZAI_API_KEY;

//Fail Fast ：尽早暴露配置错误 
if (!apiKey){
    throw new Error(
        "缺少环境变量 ZAI_API_KEY",
    );
}

export const ZAI_MODEL=
    process.env.ZAI_MODEL??
    "glm-4.7-flash";

export const zhipuClient=
    new OpenAI({
        apiKey,

        baseURL:
        process.env.ZAI_BASE_URL??
        "https://open.bigmodel.cn/api/paas/v4/",
    });