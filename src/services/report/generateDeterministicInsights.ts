import type {
    ParcelAnalysisReportSnapshot,
    ReportInsightResponse,
    ReportSnapshot,
} from "../../types/report";
import { formatArea } from "../../utils/formatArea";

function formatAreaKm2(areaM2: number) {
    return (areaM2 / 1_000_000).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function generateParcelInsights(
    parcel: ParcelAnalysisReportSnapshot,
): ReportInsightResponse {
    const insights: ReportInsightResponse["insights"] = [
        {
            category: "overview",
            title: "目标地块概况",
            content: `目标地块 ${parcel.target.featureId} 的现状用途为${parcel.target.currentUse}，几何面积为 ${formatArea(parcel.target.areaM2, { includeSquareMeters: true })}。`,
        },
    ];

    if (parcel.planning.available) {
        insights.push({
            category: "distribution",
            title: "规划用途覆盖",
            content: `当前规划用途数据覆盖目标地块的 ${((parcel.planning.coverageRatio ?? 0) * 100).toFixed(1)}%，主要规划用途为${parcel.planning.dominantUse ?? "未识别"}，未覆盖面积为 ${formatArea(parcel.planning.uncoveredAreaM2 ?? 0)}。${parcel.planning.hasOverlappingPlanningZones ? "规划分区存在空间重叠，分类面积可能重复累计。" : ""}`,
        });
    }

    if (parcel.restrictions.available) {
        insights.push({
            category: "spatial",
            title: "限制区域空间关系",
            content: parcel.restrictions.hasConflict
                ? `检测到目标地块与当前限制建设区域数据存在空间重叠，去重重叠面积为 ${formatArea(parcel.restrictions.overlapAreaM2 ?? 0)}，占地块面积 ${((parcel.restrictions.overlapRatio ?? 0) * 100).toFixed(1)}%。建议进一步核验相关业务要求。`
                : "未检测到目标地块与当前加载的限制建设区域数据发生空间重叠；该结果不构成行政审批或法律合规结论。",
        });
    }

    if (parcel.surroundings.available) {
        insights.push({
            category: "spatial",
            title: "周边条件",
            content: `${parcel.surroundings.bufferDistanceM ?? 500} 米范围内命中 ${parcel.surroundings.roadFeatureCount ?? 0} 个道路要素。${parcel.surroundings.waterConfigured ? `命中 ${parcel.surroundings.waterFeatureCount ?? 0} 个水系要素。` : "本次分析未配置水系数据源。"}`,
        });
    }

    if (parcel.quality.status !== "pass") {
        insights.push({
            category: "quality",
            title: "目标地块数据质量",
            content: `目标地块质量检查记录 ${parcel.quality.errorCount} 个错误和 ${parcel.quality.warningCount} 个警告，解读空间指标时应同步核验这些问题。`,
        });
    }

    insights.push({
        category: "recommendation",
        title: "进一步核验建议",
        content: "建议结合最新业务图层、原始规划资料和主管部门要求，对空间重叠与未覆盖区域进行进一步核验。本报告仅提供空间数据辅助审查事实。",
    });

    return {
        executiveSummary: `本次分析以地块 ${parcel.target.featureId} 为目标，基于当前加载的空间数据完成质量检查${parcel.planning.available ? "、规划用途覆盖分析" : ""}${parcel.restrictions.available ? "、限制区域冲突分析" : ""}${parcel.surroundings.available ? `和 ${parcel.surroundings.bufferDistanceM ?? 500} 米周边条件查询` : ""}。${parcel.restrictions.available && parcel.restrictions.hasConflict ? `检测到限制区域去重重叠面积 ${formatArea(parcel.restrictions.overlapAreaM2 ?? 0)}，占地块面积 ${((parcel.restrictions.overlapRatio ?? 0) * 100).toFixed(1)}%，建议进一步核验相关业务要求。` : ""}所有空间指标均来自确定性 GIS 引擎计算，不构成行政审批或法律合规结论。`,
        insights: insights.slice(0, 7),
    };
}

export function generateDeterministicInsights(
    snapshot: ReportSnapshot,
): ReportInsightResponse {
    if (snapshot.parcelAnalysis) {
        return generateParcelInsights(snapshot.parcelAnalysis);
    }

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

    if (snapshot.temporalComparison) {
        const comparison = snapshot.temporalComparison.summary;
        const leadingChange = [...comparison.categories]
            .filter((item) => item.beforeCount > 0 || item.afterCount > 0)
            .sort((first, second) =>
                Math.abs(second.shareDelta) - Math.abs(first.shareDelta),
            )[0];
        const categorySentence = leadingChange
            ? `${leadingChange.label}数量占比由 ${(leadingChange.beforeShare * 100).toFixed(1)}% 变为 ${(leadingChange.afterShare * 100).toFixed(1)}%，相差 ${(leadingChange.shareDelta * 100).toFixed(1)} 个百分点。`
            : "当前时间切片没有可比较的用地分类。";

        insights.push({
            category: "distribution",
            title: "时序聚合对比",
            content: `${comparison.beforeTime} 至 ${comparison.afterTime}，当前时间切片中的要素数量由 ${comparison.beforeFeatureCount.toLocaleString("zh-CN")} 变为 ${comparison.afterFeatureCount.toLocaleString("zh-CN")}，相差 ${comparison.featureCountDelta.toLocaleString("zh-CN")} 个。${categorySentence}该结果不表示具体地块发生了用途转换。`,
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

    if (snapshot.spatialStatistics) {
        const spatial = snapshot.spatialStatistics;

        insights.push({
            category: "spatial",
            title: spatial.method === "hexbin" ? "聚合热点概况" : "密度分析概况",
            content: spatial.method === "hexbin"
                ? `当前六边形网格聚合形成 ${spatial.occupiedCellCount ?? 0} 个有效单元，最高值单元权重为 ${(spatial.maxCellValue ?? 0).toLocaleString("zh-CN")}，占总权重的 ${((spatial.maxCellShare ?? 0) * 100).toFixed(1)}%。该结果是代表点网格聚合，不构成统计显著性检验。`
                : `当前密度热力图基于 ${spatial.inputFeatureCount.toLocaleString("zh-CN")} 个输入要素生成 ${spatial.analysisPointCount.toLocaleString("zh-CN")} 个代表点，用于连续密度表达，不构成统计显著性检验。`,
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
        content: "建议结合当前筛选条件、空间查询范围和数据质量结果开展分区对比，并对差异较大的地块进行进一步核验。",
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
    if (snapshot.parcelAnalysis) {
        const parcel = snapshot.parcelAnalysis;
        const methods = [
            "目标地块数据质量使用 GeoInsight AI 现有结构、坐标、环闭合、自相交和业务属性校验规则进行检查。",
            "规划用途覆盖通过 Polygon Intersection 与 Turf.js 面积计算获得；若规划分区彼此重叠，分类面积可能重复累计并在报告中明确提示。",
            "限制区域指标通过 Polygon Intersection、重叠几何去重合并和面积占比计算获得，仅表示当前加载数据之间的空间关系。",
            `${parcel.surroundings.bufferDistanceM ?? 500} 米周边条件使用 Turf.js Buffer 与 Intersects 空间查询计算，道路数量表示命中的道路要素数。`,
            "地图由 MapLibre GL 当前地块分析图层生成，报告快照不保存规划交集、限制交集、缓冲区或道路匹配几何。",
        ];
        const sourceNames = Object.values(parcel.sources)
            .filter((name): name is string => Boolean(name));
        if (sourceNames.length > 0) {
            methods.push(`分析数据来源：${sourceNames.join("、")}。`);
        }
        methods.push(
            aiGenerated
                ? "GLM 仅用于解释已计算的结构化 GIS 结果，不参与几何计算，不判断审批、合法性或可开发性。"
                : "报告文字结论由确定性规则生成，未调用生成式 AI。",
        );
        return methods;
    }

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

    if (snapshot.temporalComparison) {
        methods.push(
            "时序对比使用同一数据集、同一属性筛选规则和统一专题符号体系，对两个时间点进行并列比较。聚合差异不用于推断具体地块的用途转化关系。",
        );
        if (snapshot.symbology.mode === "graduated") {
            methods.push(
                "时序对比分级阈值基于两个时间点的合并值域计算，以保证两侧颜色可比。",
            );
        }
    }

    if (snapshot.spatialStatistics) {
        methods.push(
            snapshot.spatialStatistics.method === "hexbin"
                ? `空间统计采用代表点六边形网格聚合，网格尺寸为 ${snapshot.spatialStatistics.cellSizeKm ?? 0} km；该高值网格结果不是 Getis-Ord Gi*、Moran's I 或其他统计显著性检验。Polygon 通过代表点归属网格，未执行 Polygon 与网格的真实相交面积计算。`
                : "密度热力图使用 Feature 代表点及归一化权重进行 MapLibre 连续视觉表达，不生成统计显著性结论。",
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
