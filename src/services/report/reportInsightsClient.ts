import type {
    AIReportContext,
    ReportInsightResponse,
} from "../../types/report";
import {
    ReportInsightResponseSchema,
} from "./reportInsightSchema";

const REPORT_INSIGHT_TIMEOUT_MS = 30_000;

export async function generateReportInsights(
    context: AIReportContext,
): Promise<ReportInsightResponse> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        REPORT_INSIGHT_TIMEOUT_MS,
    );

    try {
        const response = await fetch("/api/report/insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ context }),
            signal: controller.signal,
        });

        const payload: unknown = await response.json();

        if (!response.ok) {
            const message = typeof payload === "object" && payload !== null &&
                "error" in payload && typeof payload.error === "string"
                ? payload.error
                : `AI 洞察请求失败：${response.status}`;
            throw new Error(message);
        }

        const candidate = typeof payload === "object" && payload !== null &&
            "result" in payload
            ? payload.result
            : payload;
        return ReportInsightResponseSchema.parse(candidate);
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error("AI 洞察请求超时，请稍后重试。");
        }

        throw error instanceof Error
            ? error
            : new Error("无法生成 AI 洞察。");
    } finally {
        window.clearTimeout(timeoutId);
    }
}
