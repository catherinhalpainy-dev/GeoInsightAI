import type { AgentContext, AgentPlanWorkspaceSnapshot } from "../../types/agent";

export function createAgentPlanWorkspaceSnapshot(
    context: AgentContext,
): AgentPlanWorkspaceSnapshot {
    return {
        workspaceRevision: context.workspaceRevision,
        targetFeatureId: context.selectedFeature?.id ?? null,
        planningLayerId: context.parcelAnalysis.planningLayer.id,
        restrictionLayerId: context.parcelAnalysis.restrictionLayer.id,
        roadLayerId: context.parcelAnalysis.roadLayer.id,
        waterLayerId: context.parcelAnalysis.waterLayer.id,
        administrativeLayerId: context.parcelAnalysis.administrativeLayer.id,
    };
}

export function isAgentPlanWorkspaceSnapshotCurrent(
    snapshot: AgentPlanWorkspaceSnapshot,
    context: AgentContext,
) {
    const current = createAgentPlanWorkspaceSnapshot(context);
    return snapshot.workspaceRevision === current.workspaceRevision &&
        snapshot.targetFeatureId === current.targetFeatureId &&
        snapshot.planningLayerId === current.planningLayerId &&
        snapshot.restrictionLayerId === current.restrictionLayerId &&
        snapshot.roadLayerId === current.roadLayerId &&
        snapshot.waterLayerId === current.waterLayerId &&
        snapshot.administrativeLayerId === current.administrativeLayerId;
}
