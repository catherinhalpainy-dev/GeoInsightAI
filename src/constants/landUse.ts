import type { LandUseType } from "../types/landUse";

// 全大写  固定配置或常量
// LAND_USE_TYPES 是一个只读数组，数组中的每一项都必须是 LandUseType
export const LAND_USE_TYPES: readonly LandUseType[] = [
    "residential",
    "commercial",
    "industrial",
    "green",
    "public",
    "transportation",
    "other",
    // 最后一项后面的逗号叫尾随逗号:增加一项时，Git 修改记录更清楚
];

// Record<键的类型, 值的类型>
// Record要求对象的键必须覆盖所有 LandUseType
export const LAND_USE_LABELS: Record<LandUseType, string> = {
    residential: "居住用地",
    commercial: "商业用地",
    industrial: "工业用地",
    green: "绿地",
    public: "公共设施",
    transportation: "交通用地",
    other: "其他",
};

export const LAND_USE_COLORS: Record<LandUseType, string> = {
    residential: "#0d9488",
    commercial: "#3b82f6",
    industrial: "#f59e0b",
    green: "#10b981",
    public: "#8b5cf6",
    transportation: "#ef4444",
    other: "#94a3b8",
};