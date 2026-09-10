import type {
    ReportInsightResponse,
    ReportSnapshot,
} from "../../types/report";

function formatAreaKm2(areaM2: number) {
    return (areaM2 / 1_000_000).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function generateDeterministicInsights(
    snapshot: ReportSnapshot,
): ReportInsightResponse {
    const dominantCategory = [...snapshot.categories].sort(
        (first, second) => second.count - first.count,
    )[0];
    const insights: ReportInsightResponse["insights"] = [];

    insights.push({
        category: "overview",
        title: "分析范围概况",
        content: `当前分析范围包含 ${snapshot.kpi.featureCount.toLocaleString("zh-CN")} 个地块，总面积约 ${formatAreaKm2(snapshot.kpi.totalAreaM2)} km²，平均单地块面积为 ${Math.round(snapshot.kpi.averageAreaM2).toLocaleString("zh-CN")} m²。`,
    });

    if (dominantCategory) {
        insights.push({
            category: "distribution",
            title: "用地结构特征",
            content: `${dominantCategory.label}数量占比最高，共 ${dominantCategory.count.toLocaleString("zh-CN")} 个，占当前结果的 ${dominantCategory.percentage.toFixed(1)}%。该结论仅反映当前筛选范围。`,
        });
    }

    if (snapshot.temporal?.enabled) {
        insights.push({
            category: "overview",
            title: "时间切片",
            content: `当前报告基于时间字段 ${snapshot.temporal.field} 的精确时间切片，包含 ${snapshot.temporal.featureCount.toLocaleString("zh-CN")} 个地块。`,
        });
    }

    if (snapshot.spatialAnalysis.spatialQueryFeatureCount > 0) {
        insights.push({
            category: "spatial",
            title: "缓冲区空间查询",
            content: `当前缓冲区查询命中 ${snapshot.spatialAnalysis.spatialQueryFeatureCount.toLocaleString("zh-CN")} 个地块，空间关系为 ${snapshot.spatialAnalysis.spatialQueryRelation ?? "intersects"}。`,
        });
    } else if (snapshot.spatialAnalysis.aoiFeatureCount > 0) {
        insights.push({
            category: "spatial",
            title: "AOI 空间查询",
            content: `当前 AOI 查询命中 ${snapshot.spatialAnalysis.aoiFeatureCount.toLocaleString("zh-CN")} 个地块，空间关系为 ${snapshot.spatialAnalysis.aoiRelation ?? "intersects"}。`,
        });
    }

    if (snapshot.spatialAnalysis.analysisResultLayers.length > 0) {
        insights.push({
            category: "spatial",
            title: "地理处理成果",
            content: `当前工作区保留 ${snapshot.spatialAnalysis.analysisResultLayers.length} 个地理处理结果图层，可结合各图层的生成方法和要素数量继续核查分析结论。`,
        });
    }

    if (snapshot.dataQuality.available) {
        insights.push({
            category: "quality",
            title: "数据质量提示",
            content: `最近一次质量检查通过率为 ${(snapshot.dataQuality.passRate ?? 0).toFixed(1)}%，包含 ${snapshot.dataQuality.errorCount ?? 0} 个错误和 ${snapshot.dataQuality.warningCount ?? 0} 个警告。报告解读时应同步关注未处理问题。`,
        });
    }

    insights.push({
        category: "recommendation",
        title: "进一步分析建议",
        content: "建议结合当前筛选条件、空间查询范围和数据质量结果开展分区对比，并对显著差异地块进行进一步核验。",
    });

    return {
        executiveSummary: `本报告基于“${snapshot.datasetName}”在 ${new Date(snapshot.generatedAt).toLocaleString("zh-CN")} 的工作区快照生成。当前结果包含 ${snapshot.kpi.featureCount.toLocaleString("zh-CN")} 个地块，总面积约 ${formatAreaKm2(snapshot.kpi.totalAreaM2)} km²。所有统计结论均来自快照中的确定性数据计算。`,
        insights: insights.slice(0, 7),
    };
}

export function createReportMethodology(
    snapshot: ReportSnapshot,
    aiGenerated: boolean,
) {
    const methods = [
        "空间渲染采用 MapLibre GL，地图图像来自报告快照生成时的当前视图。",
        "面积、分类统计与图表数据复用 GeoInsight AI 统计计算服务。",
    ];

    if (snapshot.symbology.mode === "graduated") {
        methods.push(
            `专题制图采用 ${snapshot.symbology.classificationMethod === "quantile" ? "分位数" : "等距"}分级，字段为 ${snapshot.symbology.graduatedField === "builtYear" ? "建成年份" : "面积"}，级数为 ${snapshot.symbology.classCount ?? 5}。`,
        );
    } else if (snapshot.symbology.mode === "categorized") {
        methods.push("专题制图采用用地类型唯一值分类。");
    }

    if (snapshot.temporal?.enabled) {
        methods.push(
            `时间分析采用 ${snapshot.temporal.field} 字段的精确匹配，只显示当前时间值对应的要素；缺少或无效时间值的要素不会进入该时间切片。`,
        );
    }

    if (snapshot.spatialAnalysis.hasBuffer) {
        methods.push("缓冲区与面积计算由 Turf.js 执行，报告不重新计算 Geometry。");
    }

    if (snapshot.spatialAnalysis.spatialQueryFeatureCount > 0) {
        methods.push(
            `缓冲区空间查询采用 ${snapshot.spatialAnalysis.spatialQueryRelation ?? "intersects"} 关系，由 Turf.js 执行。`,
        );
    }

    if (snapshot.spatialAnalysis.aoiFeatureCount > 0) {
        methods.push(
            `AOI 空间查询采用 ${snapshot.spatialAnalysis.aoiRelation ?? "intersects"} 关系，由 Turf.js 执行。`,
        );
    }

    methods.push(
        aiGenerated
            ? "GLM 仅用于解释结构化统计摘要，不参与几何计算，也不修改空间数据。"
            : "报告文字结论由确定性前端规则生成，未调用生成式 AI。",
    );

    return methods;
}
