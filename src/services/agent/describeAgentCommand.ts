import type { AgentCommand, AgentContext } from "../../types/agent";

export interface AgentCommandPresentation {
    title: string;
    description: string;
    metadata: string[];
}

const LAND_USE_LABELS = {
    residential: "居住用地",
    commercial: "商业用地",
    industrial: "工业用地",
    green: "绿地",
    public: "公共设施",
    transportation: "交通用地",
    other: "其他",
} as const;

function sourceDescription(
    command: Extract<AgentCommand, { type: "run_geoprocessing" }>,
    context: AgentContext,
) {
    const source = command.payload.inputSource;
    if (source === "filtered") return `当前筛选结果 · ${context.filteredFeatureCount} 个要素`;
    if (source === "aoi-query") return `AOI 查询结果 · ${context.aoiQueryFeatureCount} 个要素`;
    return `Buffer 查询结果 · ${context.bufferQueryFeatureCount} 个要素`;
}

export function getAgentCommandPresentation(
    command: AgentCommand,
    context: AgentContext,
): AgentCommandPresentation {
    switch (command.type) {
        case "parcel_quality_check":
            return { title: "检查地块质量", description: "检查目标地块几何与关键业务属性", metadata: ["本地确定性检查"] };
        case "parcel_planning_analysis":
            return { title: "分析规划用途", description: "计算目标地块与规划图层的用途覆盖", metadata: [context.parcelAnalysis.planningLayer.name ?? "规划图层"] };
        case "parcel_restriction_analysis":
            return { title: "分析限制要素", description: "计算限制要素与目标地块的重叠影响", metadata: [context.parcelAnalysis.restrictionLayer.name ?? "限制图层"] };
        case "parcel_surroundings_analysis":
            return { title: "分析 500 米周边", description: "汇总道路、水系与行政区信息", metadata: [`${command.distanceM} m`, context.parcelAnalysis.roadLayer.name ?? "道路图层"] };
        case "parcel_finalize_analysis":
            return { title: "生成地块分析结果", description: "汇总已完成步骤并更新统一地块分析看板", metadata: ["不修改原始地块"] };
        case "apply_filter": {
            const labels = command.payload.landUseTypes?.map((item) => LAND_USE_LABELS[item]).join("、");
            return { title: "应用属性筛选", description: labels ? `用地类型：${labels}` : "更新当前筛选条件", metadata: [] };
        }
        case "clear_filters":
            return { title: "清除属性筛选", description: "恢复未筛选状态", metadata: [] };
        case "update_layer_style":
            return { title: "更新图层样式", description: "更新主图层的可见性和符号样式", metadata: [] };
        case "fit_map_bounds":
            return { title: "定位当前数据", description: `定位 ${context.filteredFeatureCount} 个当前要素`, metadata: [] };
        case "navigate_statistics":
            return { title: "打开统计分析", description: "前往统计分析页面", metadata: [] };
        case "create_buffer":
            return { title: "创建缓冲区", description: `以当前地块创建 ${command.distanceM.toLocaleString("zh-CN")} 米缓冲区`, metadata: [] };
        case "query_buffer":
            return { title: "查询缓冲范围", description: "查询与缓冲区相交的当前要素", metadata: [] };
        case "query_aoi":
            return { title: "查询 AOI 范围", description: command.relation === "within" ? "查询完全位于 AOI 内的要素" : "查询与 AOI 相交的要素", metadata: [] };
        case "run_geoprocessing":
            return { title: command.payload.operation === "intersection" ? "叠加求交" : command.payload.operation === "dissolve" ? "融合处理" : "生成中心点", description: sourceDescription(command, context), metadata: [] };
        case "update_symbology":
            return { title: "更新专题制图", description: command.payload.mode === "single" ? "单一符号" : command.payload.mode === "categorized" ? "按用地类型分类" : `按 ${command.payload.field} 分为 ${command.payload.classCount} 级`, metadata: [] };
        case "set_analysis_layer_visibility": {
            const layer = context.analysisLayers.find(({ id }) => id === command.layerId);
            return { title: "更新分析图层可见性", description: `${command.visible ? "显示" : "隐藏"} ${layer?.name ?? command.layerId}`, metadata: [] };
        }
    }
}

export function isParcelAgentPlan(commands: AgentCommand[]) {
    return commands.some((command) => command.type.startsWith("parcel_"));
}
