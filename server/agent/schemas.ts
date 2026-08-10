// AI能输出什么格式
// 给Node程序调用
// zod ： 数据校验库：运行时检查数据是否合法+开发时生成TypeScript类型
import { threadId } from "worker_threads";
import { z } from "zod";

export const LandUseTypeSchema =
    // z.enum() 该值只能从几个固定字符串中选择
    z.enum([
        "residential",
        "commercial",
        "industrial",
        "green",
        "public",
        "transportation",
        "other",
    ]);

// 命令1：应用筛选
export const ApplyFilterCommandSchema =
    // z.object() 该值必须是一个对象
    z.object({
        // z.literal 必须严格等于这个固定值
        // type：命令身份证
        type: z.literal(
            "apply_filter",
        ),


        // payload:该命令携带的具体参数
        payload: z.object({
            // z.array 必须是数组  数组中每一项都必须符合LandUseTypeSchema
            // optional表示该属性可以不传
            landUseTypes: z.array(LandUseTypeSchema).optional(),
            minimumBuiltYear: z.number().int().nullable().optional(),
            districtCode: z.string().optional(),
        }),

    });

export const ClearFiltersCommandSchema =
    z.object({
        type: z.literal(
            "clear_filters",
        ),
    });


export const UpdateLayerStyleCommandSchema =
    z.object({
        type: z.literal(
            "update_layer_style",
        ),
        payload: z.object({
            layerVisible: z.boolean().optional(),

            fillVisible: z.boolean().optional(),
            fillColor: z.string().optional(),
            fillOpacity: z.number().min(0).max(1).optional(),

            outlineVisible: z.boolean().optional(),
            outlineColor: z.string().optional(),
            outlineWidth: z.number().min(0.5).max(6).optional(),
            outlineOpacity: z.number().min(0).max(1).optional(),

            colorMode: z.enum(["classified", "single",]).optional(),
        }),
    });

export const FitBoundsCommandSchema =
    z.object({
        type: z.literal(
            "fit_map_bounds",
        ),
    });

export const NavigateStatisticsCommandSchema =
    z.object({
        type: z.literal(
            "navigate_statistics",
        ),
    });



// 命令集合
export const AgentCommandSchema =
    // 依据type属性区分command类型
    z.discriminatedUnion(
        "type",
        [
            ApplyFilterCommandSchema,
            ClearFiltersCommandSchema,
            UpdateLayerStyleCommandSchema,
            FitBoundsCommandSchema,
            NavigateStatisticsCommandSchema,
        ],
    );

// 根据schema自动生成TypeScript类型
export type AgentCommand =
    z.infer<
        typeof AgentCommandSchema
    >;


// Agent Plan
// 完整的行动计划规范
export const AgentPlanSchema =
    z.object({
        // 字符串至少有一个字符
        summary: z.string().min(1),
        requiresConfirmation: z.boolean(),
        commands: z.array(AgentCommandSchema,).max(8),
    });

export type AgentPlan =
    z.infer<
        typeof AgentPlanSchema
    >;

// 给AI提供当前应用状态
export const AgentContextSchema =
    z.object({
        datasetName:
            z.string(),

        featureCount:
            z.number()
                .int()
                .nonnegative(),

        currentFilters:
            z.object({
                landUseTypes:
                    z.array(
                        LandUseTypeSchema,
                    ),

                minimumBuiltYear:
                    z.number()
                        .int()
                        .nullable(),

                districtCode:
                    z.string(),
            }),

        currentLayerStyle:
            z.object({
                layerVisible:
                    z.boolean(),

                fillVisible:
                    z.boolean(),

                fillColor:
                    z.string(),

                fillOpacity:
                    z.number(),

                outlineVisible:
                    z.boolean(),

                outlineColor:
                    z.string(),

                outlineWidth:
                    z.number(),

                outlineOpacity:
                    z.number(),

                colorMode:
                    z.enum([
                        "single",
                        "classified",
                    ]),
            }),
    });

export type AgentContext =
    z.infer<
        typeof AgentContextSchema
    >;


// HTTP 请求
export const AgentPlanRequestSchema =
    z.object({
        message:
            z.string().trim().min(1),
        context:
            AgentContextSchema,
    });

export const AgentResumeRequestSchema =
    z.object({
        threadId:
            z.string().min(1),
        approved:
            z.boolean(),

    });

export type AgentResumeRequest =
    z.infer<
        typeof AgentResumeRequestSchema
    >;