import type {
    WorkspaceCommandId,
} from "../types/search";

export type WorkspaceCommandCategory =
    | "tool"
    | "navigation"
    | "view";

export type WorkspaceCommandRequirement =
    | "dataset"
    | "selection";

export interface WorkspaceCommandDefinition {
    id: WorkspaceCommandId;
    label: string;
    description: string;
    keywords: readonly string[];
    category: WorkspaceCommandCategory;
    requiredState?: WorkspaceCommandRequirement;
}

export const WORKSPACE_COMMANDS: readonly WorkspaceCommandDefinition[] = [
    {
        id: "open-filter",
        label: "属性筛选",
        description: "打开基础筛选与高级查询",
        keywords: ["filter", "query", "查询", "筛选"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-layers",
        label: "图层管理",
        description: "打开数据与分析结果图层树",
        keywords: ["layer", "layers", "图层", "overlay"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-feature-table",
        label: "属性表",
        description: "打开当前土地利用属性表",
        keywords: ["table", "attribute", "属性表", "表格"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-layer-style",
        label: "专题制图",
        description: "打开图层样式与符号系统",
        keywords: ["symbology", "style", "thematic", "专题制图", "样式"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-aoi-analysis",
        label: "范围分析",
        description: "打开 AOI 绘制与空间查询",
        keywords: ["aoi", "范围分析", "空间查询", "within", "intersects"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-geoprocessing",
        label: "地理处理",
        description: "打开求交、融合与中心点工具",
        keywords: ["geoprocessing", "intersection", "dissolve", "centroid", "中心点", "融合"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-data-quality",
        label: "数据质量",
        description: "打开空间数据质量中心",
        keywords: ["data quality", "quality", "geometry", "数据质量", "检查"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-geometry-editor",
        label: "几何编辑",
        description: "新建、编辑或删除主数据地块",
        keywords: ["geometry edit", "edit", "polygon", "几何编辑", "地块编辑"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-data-sources",
        label: "数据源",
        description: "连接 CSV、远程 GeoJSON、XYZ 或 WMS",
        keywords: ["data source", "connection", "csv", "xyz", "wms", "数据源", "连接"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-temporal",
        label: "时间分析",
        description: "配置时间字段并打开时间轴",
        keywords: ["temporal", "timeline", "time", "year", "时间分析", "时间轴"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-spatial-statistics",
        label: "空间统计",
        description: "打开密度热力图与六边形聚合分析",
        keywords: ["spatial statistics", "density", "heatmap", "hexbin", "空间统计", "密度热点", "六边形"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-temporal-compare",
        label: "时序对比",
        description: "对比同一数据集的两个时间切片",
        keywords: ["temporal compare", "before after", "split map", "swipe", "时序对比", "分屏", "卷帘"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-report-builder",
        label: "生成报告",
        description: "打开分析报告构建中心",
        keywords: ["report builder", "report center", "报告中心", "生成报告", "分析报告"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-agent",
        label: "Agent 分析",
        description: "打开 GIS 自然语言任务规划",
        keywords: ["agent", "ai", "自然语言", "智能分析"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "open-basemap",
        label: "底图切换",
        description: "打开底图选择面板",
        keywords: ["basemap", "dark", "light", "blank", "底图"],
        category: "tool",
        requiredState: "dataset",
    },
    {
        id: "navigate-statistics",
        label: "统计分析",
        description: "前往土地利用统计页面",
        keywords: ["statistics", "stats", "统计", "图表"],
        category: "navigation",
        requiredState: "dataset",
    },
    {
        id: "navigate-report",
        label: "分析报告",
        description: "前往综合分析报告页面",
        keywords: ["report", "分析报告", "报告"],
        category: "navigation",
        requiredState: "dataset",
    },
    {
        id: "fit-all",
        label: "缩放至全部数据",
        description: "将地图定位到主数据范围",
        keywords: ["fit all", "extent", "全图", "全部范围"],
        category: "view",
        requiredState: "dataset",
    },
    {
        id: "fit-selection",
        label: "定位选择集",
        description: "将地图定位到当前选中的地块",
        keywords: ["fit selection", "selected", "定位选择", "选择集"],
        category: "view",
        requiredState: "selection",
    },
    {
        id: "clear-selection",
        label: "清除选择集",
        description: "清除当前多要素选择",
        keywords: ["clear selection", "清除选择", "取消选择"],
        category: "view",
        requiredState: "selection",
    },
];

export function getWorkspaceCommand(
    commandId: WorkspaceCommandId,
) {
    return WORKSPACE_COMMANDS.find(
        (command) => command.id === commandId,
    ) ?? null;
}
