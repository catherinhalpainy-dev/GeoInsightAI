const LAND_USE_TYPES = [
    "residential",
    "commercial",
    "industrial",
    "green",
    "public",
    "transportation",
    "other",
] as const;

const INPUT_SOURCES = [
    "filtered",
    "aoi-query",
    "buffer-query",
] as const;

const COLOR_RAMPS = [
    "teal",
    "blue",
    "green",
    "orange",
    "purple",
] as const;

const commandSchemas = [
    {
        type: "object",
        properties: {
            type: { const: "apply_filter" },
            payload: {
                type: "object",
                properties: {
                    landUseTypes: {
                        type: "array",
                        items: { type: "string", enum: LAND_USE_TYPES },
                    },
                    minimumBuiltYear: { type: ["integer", "null"] },
                    districtCode: { type: "string" },
                },
                additionalProperties: false,
            },
        },
        required: ["type", "payload"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: { type: { const: "clear_filters" } },
        required: ["type"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: {
            type: { const: "update_layer_style" },
            payload: {
                type: "object",
                properties: {
                    layerVisible: { type: "boolean" },
                    fillVisible: { type: "boolean" },
                    fillColor: { type: "string" },
                    fillOpacity: { type: "number", minimum: 0, maximum: 1 },
                    outlineVisible: { type: "boolean" },
                    outlineColor: { type: "string" },
                    outlineWidth: { type: "number", minimum: 0.5, maximum: 6 },
                    outlineOpacity: { type: "number", minimum: 0, maximum: 1 },
                    colorMode: { type: "string", enum: ["single", "classified"] },
                },
                additionalProperties: false,
            },
        },
        required: ["type", "payload"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: { type: { const: "fit_map_bounds" } },
        required: ["type"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: { type: { const: "navigate_statistics" } },
        required: ["type"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: {
            type: { const: "create_buffer" },
            distanceM: {
                type: "number",
                exclusiveMinimum: 0,
                maximum: 50000,
                description: "缓冲距离，单位为米。",
            },
        },
        required: ["type", "distanceM"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: {
            type: { const: "query_buffer" },
            relation: { const: "intersects" },
        },
        required: ["type", "relation"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: {
            type: { const: "query_aoi" },
            relation: { type: "string", enum: ["intersects", "within"] },
        },
        required: ["type", "relation"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: {
            type: { const: "run_geoprocessing" },
            payload: {
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            operation: { const: "intersection" },
                            inputSource: { type: "string", enum: INPUT_SOURCES },
                            overlaySource: { type: "string", enum: ["aoi", "buffer"] },
                        },
                        required: ["operation", "inputSource", "overlaySource"],
                        additionalProperties: false,
                    },
                    {
                        type: "object",
                        properties: {
                            operation: { const: "dissolve" },
                            inputSource: { type: "string", enum: INPUT_SOURCES },
                            dissolveField: { type: "string", enum: ["all", "landUseType"] },
                        },
                        required: ["operation", "inputSource", "dissolveField"],
                        additionalProperties: false,
                    },
                    {
                        type: "object",
                        properties: {
                            operation: { const: "centroid" },
                            inputSource: { type: "string", enum: INPUT_SOURCES },
                        },
                        required: ["operation", "inputSource"],
                        additionalProperties: false,
                    },
                ],
            },
        },
        required: ["type", "payload"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: {
            type: { const: "update_symbology" },
            payload: {
                oneOf: [
                    {
                        type: "object",
                        properties: { mode: { const: "single" } },
                        required: ["mode"],
                        additionalProperties: false,
                    },
                    {
                        type: "object",
                        properties: { mode: { const: "categorized" } },
                        required: ["mode"],
                        additionalProperties: false,
                    },
                    {
                        type: "object",
                        properties: {
                            mode: { const: "graduated" },
                            field: { type: "string", enum: ["areaM2", "builtYear"] },
                            method: { type: "string", enum: ["equalInterval", "quantile"] },
                            classCount: { type: "integer", enum: [3, 4, 5, 6] },
                            colorRamp: { type: "string", enum: COLOR_RAMPS },
                        },
                        required: ["mode", "field", "method", "classCount", "colorRamp"],
                        additionalProperties: false,
                    },
                ],
            },
        },
        required: ["type", "payload"],
        additionalProperties: false,
    },
    {
        type: "object",
        properties: {
            type: { const: "set_analysis_layer_visibility" },
            layerId: {
                type: "string",
                description: "必须来自 context.analysisLayers 中的现有 id。",
            },
            visible: { type: "boolean" },
        },
        required: ["type", "layerId", "visible"],
        additionalProperties: false,
    },
] as const;

export const AGENT_PLAN_TOOL = {
    type: "function" as const,
    function: {
        name: "submit_gis_plan",
        description:
            "提交由 GeoInsight AI 前端在用户批准后确定性执行的 GIS 操作计划。模型只规划意图和受限参数，不计算几何。",
        parameters: {
            type: "object",
            properties: {
                summary: {
                    type: "string",
                    description: "用简短中文说明计划目标。",
                },
                requiresConfirmation: {
                    type: "boolean",
                    description: "所有会修改工作区状态的命令必须为 true。",
                },
                commands: {
                    type: "array",
                    maxItems: 8,
                    items: { oneOf: commandSchemas },
                },
            },
            required: ["summary", "requiresConfirmation", "commands"],
            additionalProperties: false,
        },
    },
};
