import { useCallback, useEffect, useMemo, useState } from "react";

import type { LandUseFeature } from "../types/landUse";
import type { WorkspaceVectorLayer } from "../types/mapLayer";
import type {
    ParcelAnalysisLayerBindings,
    ParcelAnalysisRunState,
    ParcelAnalysisRunOutput,
    ParcelAnalysisStepId,
    ParcelAnalysisStepState,
} from "../types/parcelAnalysis";
import {
    ParcelAnalysisError,
    analyzeParcelPlanningUse,
    analyzeParcelQuality,
    analyzeParcelRestrictions,
    analyzeParcelSurroundings,
    assembleParcelAnalysis,
    createParcelAnalysisExecutionContext,
    suggestParcelAnalysisLayerBindings,
    validateParcelAnalysisBindings,
} from "../services/gis/parcelAnalysis";

const STEP_IDS: ParcelAnalysisStepId[] = [
    "quality",
    "planning",
    "restriction",
    "surroundings",
    "summary",
];

function createIdleSteps(): ParcelAnalysisStepState[] {
    return STEP_IDS.map((id) => ({ id, status: "idle" }));
}

function createResultSteps(output: ParcelAnalysisRunOutput): ParcelAnalysisStepState[] {
    return createIdleSteps().map((step) => {
        if (step.id === "quality") {
            return {
                ...step,
                status: output.result.quality.status === "pass"
                    ? "completed" as const
                    : output.result.quality.status === "warning"
                        ? "warning" as const
                        : "failed" as const,
            };
        }
        if (step.id === "planning") return { ...step, status: output.result.planning ? "completed" as const : "idle" as const };
        if (step.id === "restriction") return { ...step, status: output.result.restrictions ? "completed" as const : "idle" as const };
        if (step.id === "surroundings") return { ...step, status: output.result.surroundings ? "completed" as const : "idle" as const };
        return { ...step, status: "completed" as const };
    });
}

const INITIAL_STATE: ParcelAnalysisRunState = {
    status: "idle",
    steps: createIdleSteps(),
    result: null,
    artifacts: null,
    error: null,
};

function updateStep(
    steps: ParcelAnalysisStepState[],
    id: ParcelAnalysisStepId,
    status: ParcelAnalysisStepState["status"],
    message?: string,
) {
    return steps.map((step) => step.id === id ? { id, status, message } : step);
}

export function useParcelAnalysis(
    selectedFeature: LandUseFeature | null,
    overlayLayers: WorkspaceVectorLayer[],
) {
    const [bindings, setBindings] = useState<ParcelAnalysisLayerBindings>(() =>
        suggestParcelAnalysisLayerBindings(overlayLayers),
    );
    const [runState, setRunState] = useState<ParcelAnalysisRunState>(INITIAL_STATE);

    useEffect(() => {
        const suggested = suggestParcelAnalysisLayerBindings(overlayLayers);
        const available = new Set(overlayLayers.map(({ id }) => id));
        setBindings((current) => {
            const next: ParcelAnalysisLayerBindings = {
            planningLayerId: current.planningLayerId && available.has(current.planningLayerId)
                ? current.planningLayerId : suggested.planningLayerId,
            restrictionLayerId: current.restrictionLayerId && available.has(current.restrictionLayerId)
                ? current.restrictionLayerId : suggested.restrictionLayerId,
            roadLayerId: current.roadLayerId && available.has(current.roadLayerId)
                ? current.roadLayerId : suggested.roadLayerId,
            waterLayerId: current.waterLayerId && available.has(current.waterLayerId)
                ? current.waterLayerId : suggested.waterLayerId,
            administrativeLayerId:
                current.administrativeLayerId && available.has(current.administrativeLayerId)
                    ? current.administrativeLayerId : suggested.administrativeLayerId,
            };
            return Object.keys(next).every((key) => {
                const bindingKey = key as keyof ParcelAnalysisLayerBindings;
                return next[bindingKey] === current[bindingKey];
            }) ? current : next;
        });
    }, [overlayLayers]);

    const validationErrors = useMemo(
        () => validateParcelAnalysisBindings(bindings, overlayLayers),
        [bindings, overlayLayers],
    );
    const planningCollection = overlayLayers.find(({ id }) => id === bindings.planningLayerId)?.collection;
    const restrictionCollection = overlayLayers.find(({ id }) => id === bindings.restrictionLayerId)?.collection;
    const roadCollection = overlayLayers.find(({ id }) => id === bindings.roadLayerId)?.collection;
    const waterCollection = overlayLayers.find(({ id }) => id === bindings.waterLayerId)?.collection;
    const administrativeCollection = overlayLayers
        .find(({ id }) => id === bindings.administrativeLayerId)?.collection;

    const clear = useCallback(() => setRunState(INITIAL_STATE), []);

    const commit = useCallback((
        output: ParcelAnalysisRunOutput,
        source: "manual" | "agent" = "agent",
    ) => {
        setRunState({
            status: "completed",
            steps: createResultSteps(output),
            result: {
                ...output.result,
                execution: { source },
            },
            artifacts: output.artifacts,
            error: null,
        });
    }, []);

    const restore = useCallback((output: ParcelAnalysisRunOutput | null) => {
        if (!output) {
            setRunState(INITIAL_STATE);
            return;
        }
        setRunState({
            status: "completed",
            steps: createResultSteps(output),
            result: output.result,
            artifacts: output.artifacts,
            error: null,
        });
    }, []);

    useEffect(() => {
        setRunState((current) => current.status === "idle" ? current : INITIAL_STATE);
    }, [
        selectedFeature,
        bindings,
        planningCollection,
        restrictionCollection,
        roadCollection,
        waterCollection,
        administrativeCollection,
    ]);

    const setBinding = useCallback((
        key: keyof ParcelAnalysisLayerBindings,
        layerId: string | null,
    ) => {
        setBindings((current) => ({ ...current, [key]: layerId }));
    }, []);

    const run = useCallback(async () => {
        if (!selectedFeature) {
            setRunState({
                ...INITIAL_STATE,
                status: "failed",
                error: "请先在地图、属性表或搜索中选择一个主数据地块。",
            });
            return;
        }

        let activeStep: ParcelAnalysisStepId = "quality";
        let steps = createIdleSteps();
        const commitStep = (
            id: ParcelAnalysisStepId,
            status: ParcelAnalysisStepState["status"],
            message?: string,
        ) => {
            steps = updateStep(steps, id, status, message);
            setRunState((current) => ({ ...current, status: "running", steps }));
        };

        setRunState({ ...INITIAL_STATE, status: "running", steps });
        try {
            const context = createParcelAnalysisExecutionContext(
                selectedFeature,
                bindings,
                overlayLayers,
            );

            commitStep("quality", "running");
            await Promise.resolve();
            const quality = analyzeParcelQuality(context.targetFeature);
            if (quality.status === "error") {
                throw new ParcelAnalysisError(
                    "quality",
                    "目标地块几何或必需属性存在错误，无法继续空间分析。",
                );
            }
            commitStep("quality", quality.status === "warning" ? "warning" : "completed");

            activeStep = "planning";
            commitStep("planning", "running");
            await Promise.resolve();
            const planning = analyzeParcelPlanningUse(context.targetFeature, context.planningLayer);
            commitStep(
                "planning",
                planning.result.hasOverlappingPlanningZones ? "warning" : "completed",
                planning.result.hasOverlappingPlanningZones ? "规划分区存在重叠，覆盖率可能重复累计。" : undefined,
            );

            activeStep = "restriction";
            commitStep("restriction", "running");
            await Promise.resolve();
            const restrictions = analyzeParcelRestrictions(context.targetFeature, context.restrictionLayer);
            commitStep("restriction", restrictions.result.hasConflict ? "warning" : "completed");

            activeStep = "surroundings";
            commitStep("surroundings", "running");
            await Promise.resolve();
            const surroundings = analyzeParcelSurroundings(
                context.targetFeature,
                context.roadLayer,
                context.waterLayer,
                context.administrativeLayer,
            );
            commitStep(
                "surroundings",
                surroundings.warnings.length > 0 ? "warning" : "completed",
                surroundings.warnings.join(" ") || undefined,
            );

            activeStep = "summary";
            commitStep("summary", "running");
            const output = assembleParcelAnalysis(
                context,
                quality,
                planning,
                restrictions,
                surroundings,
            );
            steps = updateStep(steps, "summary", "completed");
            setRunState({
                status: "completed",
                steps,
                result: {
                    ...output.result,
                    execution: { source: "manual" },
                },
                artifacts: output.artifacts,
                error: null,
            });
        } catch (error) {
            const failedStep = error instanceof ParcelAnalysisError && error.step !== "preflight"
                ? error.step
                : activeStep;
            const message = error instanceof Error ? error.message : "地块分析执行失败。";
            steps = updateStep(steps, failedStep, "failed", message);
            setRunState({
                status: "failed",
                steps,
                result: null,
                artifacts: null,
                error: message,
            });
        }
    }, [bindings, overlayLayers, selectedFeature]);

    return {
        bindings,
        validationErrors,
        runState,
        setBinding,
        run,
        clear,
        commit,
        restore,
    };
}
