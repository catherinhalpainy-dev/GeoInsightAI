import type { AgentCommand, AgentContext, AgentPlan } from "./schemas";

const PARCEL_COMMAND_ORDER = [
    "parcel_quality_check",
    "parcel_planning_analysis",
    "parcel_restriction_analysis",
    "parcel_surroundings_analysis",
    "parcel_finalize_analysis",
] as const;

type ParcelCommandType = typeof PARCEL_COMMAND_ORDER[number];

function isParcelCommand(command: AgentCommand) {
    return command.type.startsWith("parcel_");
}

function unavailable(message: string): AgentPlan {
    return {
        summary: `当前无法执行：${message}`,
        requiresConfirmation: false,
        commands: [],
        domain: "parcel-analysis",
    };
}

export function normalizeAgentPlan(plan: AgentPlan, context: AgentContext): AgentPlan {
    const parcelCommands = plan.commands.filter(isParcelCommand);
    if (parcelCommands.length === 0) {
        return { ...plan, domain: plan.domain ?? "general-gis" };
    }
    if (parcelCommands.length !== plan.commands.length) {
        return unavailable("地块分析计划不能与通用 GIS 操作混合，请分开执行。");
    }
    if (!context.selectedFeature) return unavailable("请先在地图中选择一个目标地块。");

    const commandTypes = new Set(parcelCommands.map(({ type }) => type));
    if (commandTypes.has("parcel_planning_analysis") && !context.parcelAnalysis.planningLayer.available) {
        return unavailable("当前未绑定可用的规划图层。");
    }
    if (commandTypes.has("parcel_restriction_analysis") && !context.parcelAnalysis.restrictionLayer.available) {
        return unavailable("当前未绑定可用的限制要素图层。");
    }
    if (commandTypes.has("parcel_surroundings_analysis") && !context.parcelAnalysis.roadLayer.available) {
        return unavailable("当前未绑定可用的道路图层，无法执行周边分析。");
    }

    const byType = new Map<ParcelCommandType, AgentCommand>();
    parcelCommands.forEach((command) => byType.set(command.type as ParcelCommandType, command));
    byType.set("parcel_quality_check", { type: "parcel_quality_check" });
    byType.set("parcel_finalize_analysis", { type: "parcel_finalize_analysis" });

    return {
        ...plan,
        domain: "parcel-analysis",
        requiresConfirmation: true,
        commands: PARCEL_COMMAND_ORDER.flatMap((type) => {
            const command = byType.get(type);
            return command ? [command] : [];
        }),
    };
}
