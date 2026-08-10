import type {
    AgentContext,
    AgentResumeResponse,
    AgentStartResponse,
} from "../types/agent";


interface ApiErrorResponse {
    ok?: false;
    error?: string;
}


async function readErrorMessage(
    response: Response,
) {
    try {
        const data =
            await response.json()as ApiErrorResponse;

        return (
            data.error ??
            `请求失败：${response.status}`
        );
    } catch {
        return (
            `请求失败：${response.status}`
        );
    }
}


export async function startAgent(
    message: string,
    context: AgentContext,
): Promise<AgentStartResponse> {

    const response =
        await fetch(
            "/api/agent/start",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body:
                    JSON.stringify({
                        message,
                        context,
                    }),
            },
        );


    if (!response.ok) {
        throw new Error(
            await readErrorMessage(
                response,
            ),
        );
    }


    return (
        await response.json()
    ) as AgentStartResponse;
}


export async function resumeAgent(
    threadId: string,
    approved: boolean,
): Promise<AgentResumeResponse> {

    const response =
        await fetch(
            "/api/agent/resume",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body:
                    JSON.stringify({
                        threadId,
                        approved,
                    }),
            },
        );


    if (!response.ok) {
        throw new Error(
            await readErrorMessage(
                response,
            ),
        );
    }


    return (
        await response.json()
    ) as AgentResumeResponse;
}