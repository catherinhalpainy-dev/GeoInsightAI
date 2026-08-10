import type {
    AgentContext,
    AgentResumeResponse,
    AgentStartResponse,
} from "../types/agent";

const AGENT_TIMEOUT_MS =
  30_000;

async function requestAgentApi(
  url: string,
  body: unknown,
): Promise<Response> {
  const controller =
    new AbortController();

  const timeoutId =
    window.setTimeout(
      () => {
        controller.abort();
      },
      AGENT_TIMEOUT_MS,
    );

  try {
    return await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(body),

        signal:
          controller.signal,
      },
    );
  } catch (
    error: unknown
  ) {
    if (
      error instanceof DOMException &&
      error.name ===
        "AbortError"
    ) {
      throw new Error(
        "Agent 请求超时，请稍后重试",
      );
    }

    throw new Error(
      "无法连接 GeoInsight Agent 服务，请确认 Agent 后端正在运行",
    );
  } finally {
    window.clearTimeout(
      timeoutId,
    );
  }
}

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
        await requestAgentApi(
            "/api/agent/start",
            {
                message,
                context,
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
        await requestAgentApi(
            "/api/agent/resume",
            {
               threadId,
               approved,
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