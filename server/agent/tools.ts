// 告诉AI可以调用什么工具
// 给LLM看
export const AGENT_PLAN_TOOL = {
    type: "function" as const,

    function: {
        name: "submit_gis_plan",

        description:
            "提交一个由 GeoInsight AI 前端安全执行的 GIS 操作计划。只要用户要求修改筛选、地图样式、地图视图或页面导航，就调用此函数。",

        parameters: {
            type: "object",

            properties: {
                summary: {
                    type: "string",

                    description:
                        "用简短中文总结准备执行的操作。",
                },

                requiresConfirmation: {
                    type: "boolean",

                    description:
                        "如果计划会修改筛选或图层样式则必须为 true。",
                },

                commands: {
                    type: "array",

                    maxItems: 8,

                    items: {
                        oneOf: [
                            {
                                type: "object",

                                properties: {
                                    type: {
                                        const:
                                            "apply_filter",
                                    },

                                    payload: {
                                        type: "object",

                                        properties: {
                                            landUseTypes: {
                                                type: "array",

                                                items: {
                                                    type: "string",

                                                    enum: [
                                                        "residential",
                                                        "commercial",
                                                        "industrial",
                                                        "green",
                                                        "public",
                                                        "transportation",
                                                        "other",
                                                    ],
                                                },
                                            },

                                            minimumBuiltYear: {
                                                type: [
                                                    "integer",
                                                    "null",
                                                ],
                                            },

                                            districtCode: {
                                                type: "string",
                                            },
                                        },

                                        additionalProperties:
                                            false,
                                    },
                                },

                                required: [
                                    "type",
                                    "payload",
                                ],

                                additionalProperties:
                                    false,
                            },

                            {
                                type: "object",

                                properties: {
                                    type: {
                                        const:
                                            "clear_filters",
                                    },
                                },

                                required: [
                                    "type",
                                ],

                                additionalProperties:
                                    false,
                            },

                            {
                                type: "object",

                                properties: {
                                    type: {
                                        const:
                                            "update_layer_style",
                                    },

                                    payload: {
                                        type: "object",

                                        properties: {
                                            fillVisible: {
                                                type: "boolean",
                                            },

                                            fillColor: {
                                                type: "string",
                                            },

                                            fillOpacity: {
                                                type: "number",
                                                minimum: 0,
                                                maximum: 1,
                                            },

                                            outlineVisible: {
                                                type: "boolean",
                                            },

                                            outlineColor: {
                                                type: "string",
                                            },

                                            outlineWidth: {
                                                type: "number",
                                                minimum: 0.5,
                                                maximum: 6,
                                            },

                                            outlineOpacity: {
                                                type: "number",
                                                minimum: 0,
                                                maximum: 1,
                                            },

                                            colorMode: {
                                                type: "string",

                                                enum: [
                                                    "single",
                                                    "classified",
                                                ],
                                            },
                                        },

                                        additionalProperties:
                                            false,
                                    },
                                },

                                required: [
                                    "type",
                                    "payload",
                                ],

                                additionalProperties:
                                    false,
                            },

                            {
                                type: "object",

                                properties: {
                                    type: {
                                        const:
                                            "fit_map_bounds",
                                    },
                                },

                                required: [
                                    "type",
                                ],

                                additionalProperties:
                                    false,
                            },

                            {
                                type: "object",

                                properties: {
                                    type: {
                                        const:
                                            "navigate_statistics",
                                    },
                                },

                                required: [
                                    "type",
                                ],

                                additionalProperties:
                                    false,
                            },
                        ],
                    },
                },
            },

            required: [
                "summary",
                "requiresConfirmation",
                "commands",
            ],

            additionalProperties:
                false,
        },
    },
};