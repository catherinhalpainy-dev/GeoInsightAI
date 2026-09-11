import type { AIReportContext } from "../../src/types/report";
import {
    ReportInsightResponseSchema,
} from "../../src/services/report/reportInsightSchema";
import { ZAI_MODEL, zhipuClient } from "../llm/zhipuClient";

const SYSTEM_PROMPT = `你是城市空间分析报告助手。
你只能根据用户提供的结构化统计摘要进行总结、比较和解释。
不得发明不存在的数据，不得声称执行了新的 GIS 分析，不得生成摘要中没有依据的行政政策事实。
时序对比只能描述汇总数量、面积和分类占比的差异，不得推断具体地块从一种用途转化为另一种用途。
空间统计摘要仅表示密度热力图或代表点六边形网格聚合。不得将其描述为 Getis-Ord Gi*、Moran's I、p-value、z-score 或“统计显著性热点”。
如果摘要不足以支持判断，请使用谨慎表述。
建议必须写成“建议进一步分析或核验”，不得替代政府或业务方做决策。
输出专业、简洁、可解释的中文。
必须只返回 JSON，格式为：
{"executiveSummary":"...","insights":[{"category":"overview|distribution|spatial|quality|recommendation","title":"...","content":"..."}]}
洞察数量 3 至 7 条。`;

function parseModelJson(content: string) {
    const normalized = content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

    try {
        return JSON.parse(normalized) as unknown;
    } catch {
        throw new Error("AI 返回内容不是有效的 JSON。 ");
    }
}

export async function createReportInsights(
    context: AIReportContext,
) {
    const completion = await zhipuClient.chat.completions.create(
        {
            model: ZAI_MODEL,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `请基于以下报告统计摘要生成洞察：\n${JSON.stringify(context)}`,
                },
            ],
        },
        { signal: AbortSignal.timeout(30_000) },
    );
    const content = completion.choices[0]?.message.content;

    if (!content) {
        throw new Error("AI 未返回报告洞察。 ");
    }

    return ReportInsightResponseSchema.parse(parseModelJson(content));
}
