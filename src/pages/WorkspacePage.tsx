// 地图工作台界面
// 组件名称首字母大写
// section             HTML 元素
// DataImportPage      React 组件
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../app/AppProvider";
import { MapView } from "../components/map/MapView";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LandUseFeatureCollection, LandUseFeature } from "../types/landUse";
import { FilterPanel } from "../components/filter/FilterPanel";
import { WorkspaceToolbar } from "../components/workspace/WorkspaceToolbar";
import "../styles/workspace.css";
import { type WorkspacePanel, type WorkspaceTool, type MapViewCommand, type MapViewCommandType, type BasemapType } from "../types/workspace";
import { LayerPanel } from "../components/layers/LayerPanel";
import { DEFAULT_LAYER_STYLE, type LayerStyle } from "../types/layerStyle";
import { LayerStylePanel } from "../components/layers/LayerStylePanel";

import { AgentPanel } from "../components/agent/AgentPanel";
import type {
    AgentCommand,
    AgentContext,
    AgentExecutionEvent,
    AgentPlan,
    AgentPlanExecutionResult,
} from "../types/agent";
import type { LandUseFilters } from "../app/appTypes";
import { FeatureInfoPanel } from "../components/workspace/FeatureInfoPanel";
import { BasemapPanel } from "../components/workspace/BasemapPanel";
import { FeatureTablePanel, } from "../components/workspace/FeatureTablePanel";
import { AoiAnalysisPanel } from "../components/workspace/AoiAnalysisPanel";
import { GeoprocessingPanel } from "../components/workspace/GeoprocessingPanel";
import { BatchEditPanel } from "../components/workspace/BatchEditPanel";
import { GeometryEditPanel } from "../components/workspace/GeometryEditPanel";
import { DataSourcePanel } from "../components/workspace/DataSourcePanel";
import { TemporalConfigPanel } from "../components/temporal/TemporalConfigPanel";
import { TimelineControl } from "../components/temporal/TimelineControl";
import { SpatialStatisticsPanel } from "../components/workspace/SpatialStatisticsPanel";
import { TemporalComparePanel } from "../components/compare/TemporalComparePanel";
import { TemporalMapCompareView } from "../components/compare/TemporalMapCompareView";
import {
    DataQualityPanel,
    type DataQualityTargetOption,
} from "../components/workspace/DataQualityPanel";

import { MeasureResult } from "../components/map/measure/MeasureResult";
import { useMeasure } from "../hooks/useMeasure";
import { useAoiSketch } from "../hooks/useAoiSketch";
import type {
    AoiAnalysisResult,
    AoiFeature,
    AoiQueryRelation,
    AnalysisResultFeatureCollection,
    AnalysisResultLayer,
    BufferAnalysisResult,
    GeoprocessingRunRequest,
    GeoprocessingRunSummary,
    SpatialQueryResult,
} from "../types/analysis";
import {
    calculateBufferAreaM2,
    createBuffer,
    type BufferFeature,
} from "../services/gis/buffer";
import {
    queryFeaturesByGeometry,
    summarizeSpatialQuery,
} from "../services/gis/spatialQuery";
import {
    downloadLandUseCsv,
} from "../services/export/exportCsv";
import {
    getColorRampColors,
} from "../constants/colorRamps";
import {
    createGraduatedClasses,
} from "../services/gis/symbology";
import {
    calculateAnalysisAreaM2,
    createCentroids,
    dissolveFeatures,
    getAnalysisGeometryType,
    intersectFeaturesWithGeometry,
} from "../services/gis/geoprocessing";
import {
    exportFeatureCollection,
} from "../services/export/exportGeoJson";
import {
    parseOverlayGeoJson,
} from "../services/gis/overlayLayer";
import {
    createDefaultOverlayLayerStyle,
} from "../constants/overlayLayerStyles";
import type {
    OverlayLayerStyle,
    WorkspaceVectorLayer,
    WorkspaceRasterLayer,
} from "../types/mapLayer";
import { fetchRemoteGeoJson } from "../services/import/remoteGeoJson";
import { applyLandUseFilters } from "../utils/applyLandUseFilters";
import { useEditHistory } from "../hooks/useEditHistory";
import { useGeometryEditor } from "../hooks/useGeometryEditor";
import type {
    EditTransaction,
    LandUsePropertyChanges,
} from "../types/editHistory";
import type {
    CleanedDatasetResult,
    DataQualityFeatureCollection,
    DataQualityIssue,
    DataQualityMapFeatureCollection,
    DataQualityReport,
} from "../types/dataQuality";
import {
    createCleanedDataset,
    createDataQualityMapCollection,
    scanFeatureCollection,
    validateEditablePolygonGeometry,
} from "../services/gis/dataQuality";
import {
    exportDataQualityReport,
} from "../services/export/exportDataQualityReport";
import {
    calculateEditedGeometryAreaM2,
    createClosedPolygonGeometry,
    extractPolygonVertices,
} from "../services/gis/geometryEditing";
import type {
    NewLandUseProperties,
} from "../types/geometryEditing";
import { useProjectContext } from "../project/ProjectProvider";
import type {
    ProjectMapState,
    ProjectSnapshotInput,
} from "../types/project";
import {
    useGlobalSearch,
    type WorkspaceSearchController,
} from "../search/GlobalSearchProvider";
import {
    buildWorkspaceSearchIndex,
} from "../services/search/workspaceSearch";
import {
    getWorkspaceCommand,
} from "../constants/workspaceCommands";
import type {
    SearchHighlightFeature,
    WorkspaceCommandId,
    WorkspaceSearchResult,
} from "../types/search";
import {
    ReportBuilderPanel,
    type ReportBuilderConfig,
} from "../components/report/ReportBuilderPanel";
import { useReportContext } from "../report/ReportProvider";
import {
    createAIReportContext,
    createReportSnapshot,
} from "../services/report/createReportSnapshot";
import {
    generateDeterministicInsights,
} from "../services/report/generateDeterministicInsights";
import {
    generateReportInsights,
} from "../services/report/reportInsightsClient";
import type {
    MapCaptureResult,
    ReportAiStatus,
    ReportSnapshotStatus,
} from "../types/report";
import {
    DEFAULT_TEMPORAL_CONFIG,
    type TemporalConfig,
} from "../types/temporal";
import { detectTemporalFields } from "../services/temporal/detectTemporalField";
import {
    filterFeaturesByTemporalConfig,
    filterCollectionAtTemporalValue,
    getAvailableTemporalValues,
} from "../services/temporal/filterTemporalFeatures";
import { calculateTemporalStatistics } from "../services/temporal/calculateTemporalStatistics";
import { calculateTemporalChange } from "../services/temporal/calculateChange";
import { calculateTemporalComparison } from "../services/temporal/calculateTemporalComparison";
import { formatTemporalValue } from "../services/temporal/formatTemporalValue";
import {
    DEFAULT_TEMPORAL_MAP_COMPARE_CONFIG,
    type TemporalCompareCaptureResult,
    type TemporalCompareSnapshot,
    type TemporalMapCompareConfig,
} from "../types/mapCompare";
import type {
    SpatialRepresentativePointCollection,
    SpatialStatisticsConfig,
    SpatialStatisticsFeatureCollection,
    SpatialStatisticsInput,
    SpatialStatisticsInputOption,
    SpatialStatisticsRunRequest,
    SpatialStatisticsSummary,
} from "../types/spatialStatistics";
import {
    DEFAULT_SPATIAL_STATISTICS_CONFIG,
} from "../types/spatialStatistics";
import {
    createHeatmapAnalysis,
    createHexbinAnalysis,
    supportsAreaWeight,
} from "../services/gis/spatialStatistics";
// section 表示一个独立的页面功能区域

interface AgentSnapshot {
    filters: LandUseFilters;
    layerStyle: LayerStyle;
    bufferFeature: BufferFeature | null;
    bufferResult: BufferAnalysisResult | null;
    bufferError: string | null;
    spatialQueryFeatures: LandUseFeature[];
    spatialQueryResult: SpatialQueryResult | null;
    spatialQueryError: string | null;
    aoiRelation: AoiQueryRelation;
    aoiQueryFeatures: LandUseFeature[];
    aoiAnalysisResult: AoiAnalysisResult | null;
    aoiQueryError: string | null;
    analysisResultLayers: AnalysisResultLayer[];
    geoprocessingSummary: GeoprocessingRunSummary | null;
    geoprocessingError: string | null;
}

const EMPTY_LAND_USE_COLLECTION: LandUseFeatureCollection = {
    type: "FeatureCollection",
    features: [],
};

interface AgentExecutionContext {
    filters: LandUseFilters;
    filteredCollection: LandUseFeatureCollection;
    layerStyle: LayerStyle;
    bufferFeature: BufferFeature | null;
    bufferResult: BufferAnalysisResult | null;
    spatialQueryFeatures: LandUseFeature[];
    spatialQueryResult: SpatialQueryResult | null;
    aoiQueryFeatures: LandUseFeature[];
    aoiAnalysisResult: AoiAnalysisResult | null;
    analysisResultLayers: AnalysisResultLayer[];
}

interface GeoprocessingExecutionResult {
    layer: AnalysisResultLayer;
    summary: GeoprocessingRunSummary;
}

type AgentCommandExecutionResult =
    | {
        success: true;
        message: string;
    }
    | {
        success: false;
        message: string;
    };

function areAoiFeaturesEqual(
    first: AoiFeature | null,
    second: AoiFeature,
) {
    const firstRing = first?.geometry.coordinates[0];
    const secondRing = second.geometry.coordinates[0];

    return Boolean(
        firstRing &&
        secondRing &&
        firstRing.length === secondRing.length &&
        firstRing.every((coordinate, index) => (
            coordinate[0] === secondRing[index][0] &&
            coordinate[1] === secondRing[index][1]
        )),
    );
}

function getSpatialStatisticsInputKey(input: SpatialStatisticsInput) {
    return typeof input === "string"
        ? input
        : `overlay:${input.layerId}`;
}


export function WorkspacePage() {
    const navigate = useNavigate();
    const [
        basemap,
        setBasemap,
    ] = useState<BasemapType>(
        "dark",
    );
    const [searchParams, setSearchParams,] = useSearchParams();
    const { registerWorkspaceSearch } = useGlobalSearch();

    const { state, dispatch, filteredFeatures, } = useAppContext();
    const {
        projectMeta,
        pendingProject,
        registerWorkspaceController,
        notifyPersistenceStateChange,
        markProjectDirty,
        completeProjectRestore,
        workspaceRevision,
    } = useProjectContext();
    const { reportDraft, setReportDraft } = useReportContext();

    const [
        activeTool,
        setActiveTool,
    ] = useState<WorkspaceTool>(
        "select",
    );

    const [
        activePanel,
        setActivePanel,
    ] = useState<WorkspacePanel>(
        null,
    );

    const [
        mapViewCommand,
        setMapViewCommand,
    ] = useState<MapViewCommand | null>(
        null,
    );
    const [projectMapState, setProjectMapState] =
        useState<ProjectMapState>(() => pendingProject?.map ?? ({
            basemap: "dark",
            center: [116.40, 39.93],
            zoom: 10,
            bearing: 0,
            pitch: 0,
        }));
    const [restoreViewState, setRestoreViewState] = useState<{
        requestId: number;
        state: ProjectMapState;
    } | null>(() => pendingProject
        ? {
            requestId: 1,
            state: pendingProject.map,
        }
        : null);

    function requestMapView(
        type: Exclude<
            MapViewCommandType,
            | "fit-overlay"
            | "fit-quality-issue"
            | "fit-search-layer"
            | "fit-spatial-cell"
            | "jump-to-coordinate"
        >,
    ) {
        setMapViewCommand(
            (previous) => (
                {
                    type,
                    requestId: (
                        previous?.requestId ?? 0
                    ) + 1,
                }
            ),
        );
    }

    function handleProjectMapStateChange(nextState: ProjectMapState) {
        setProjectMapState(nextState);

        if (restoreViewState) {
            const restored = restoreViewState.state;
            const cameraMatches =
                Math.abs(restored.center[0] - nextState.center[0]) < 1e-7 &&
                Math.abs(restored.center[1] - nextState.center[1]) < 1e-7 &&
                Math.abs(restored.zoom - nextState.zoom) < 1e-5 &&
                Math.abs(restored.bearing - nextState.bearing) < 1e-5 &&
                Math.abs(restored.pitch - nextState.pitch) < 1e-5;

            if (cameraMatches) {
                setRestoreViewState(null);
                return;
            }

            setRestoreViewState(null);
        }

        if (!pendingProject) {
            markProjectDirty();
        }
    }

    const [
        selectedFeature,
        setSelectedFeature,
    ] =
        useState<LandUseFeature | null>(
            null,
        );
    const [selectedFeatureIds, setSelectedFeatureIds] =
        useState<string[]>([]);
    const [editMessage, setEditMessage] =
        useState<string | null>(null);

    const [bufferFeature, setBufferFeature] =
        useState<BufferFeature | null>(null);
    const [bufferResult, setBufferResult] =
        useState<BufferAnalysisResult | null>(null);
    const [bufferError, setBufferError] =
        useState<string | null>(null);
    const [spatialQueryFeatures, setSpatialQueryFeatures] =
        useState<LandUseFeature[]>([]);
    const [spatialQueryResult, setSpatialQueryResult] =
        useState<SpatialQueryResult | null>(null);
    const [spatialQueryError, setSpatialQueryError] =
        useState<string | null>(null);

    const {
        mode: aoiMode,
        points: aoiPoints,
        polygon: aoiPolygon,
        start: startAoi,
        addPoint: addAoiPoint,
        complete: completeAoi,
        restart: restartAoi,
        clear: clearAoi,
        restore: restoreAoi,
    } = useAoiSketch();
    const [persistedAoiFeature, setPersistedAoiFeature] =
        useState<typeof aoiPolygon>(null);
    const [aoiRelation, setAoiRelation] =
        useState<AoiQueryRelation>("intersects");
    const [aoiQueryFeatures, setAoiQueryFeatures] =
        useState<LandUseFeature[]>([]);
    const [aoiAnalysisResult, setAoiAnalysisResult] =
        useState<AoiAnalysisResult | null>(null);
    const [aoiQueryError, setAoiQueryError] =
        useState<string | null>(null);
    const [analysisResultLayers, setAnalysisResultLayers] =
        useState<AnalysisResultLayer[]>([]);
    const [overlayLayers, setOverlayLayers] =
        useState<WorkspaceVectorLayer[]>([]);
    const [rasterLayers, setRasterLayers] =
        useState<WorkspaceRasterLayer[]>([]);
    const [temporalConfig, setTemporalConfig] = useState<TemporalConfig>(() => ({
        ...(pendingProject?.workspace.temporalConfig ?? DEFAULT_TEMPORAL_CONFIG),
    }));
    const [temporalCompareConfig, setTemporalCompareConfig] =
        useState<TemporalMapCompareConfig>(() => ({
            ...DEFAULT_TEMPORAL_MAP_COMPARE_CONFIG,
            ...pendingProject?.workspace.temporalCompare,
            enabled: false,
        }));
    const [temporalCompareSnapshot, setTemporalCompareSnapshot] =
        useState<TemporalCompareSnapshot | null>(null);
    const [temporalCompareError, setTemporalCompareError] =
        useState<string | null>(null);
    const [temporalCompareCapturing, setTemporalCompareCapturing] =
        useState(false);
    const [temporalCompareCaptureRequestId, setTemporalCompareCaptureRequestId] =
        useState<number | null>(null);
    const [spatialStatisticsConfig, setSpatialStatisticsConfig] =
        useState<SpatialStatisticsConfig>(DEFAULT_SPATIAL_STATISTICS_CONFIG);
    const [spatialHeatmapData, setSpatialHeatmapData] =
        useState<SpatialRepresentativePointCollection | null>(null);
    const [spatialStatisticsSummary, setSpatialStatisticsSummary] =
        useState<SpatialStatisticsSummary | null>(null);
    const [spatialStatisticsError, setSpatialStatisticsError] =
        useState<string | null>(null);
    const [spatialStatisticsAnalyzing, setSpatialStatisticsAnalyzing] =
        useState(false);
    const [activeHeatmapRequest, setActiveHeatmapRequest] =
        useState<SpatialStatisticsRunRequest | null>(null);
    const [spatialStatisticsResultLayerId, setSpatialStatisticsResultLayerId] =
        useState<string | null>(null);
    const [overlayImportError, setOverlayImportError] =
        useState<string | null>(null);
    const [overlayImporting, setOverlayImporting] =
        useState(false);
    const [refreshingOverlayLayerId, setRefreshingOverlayLayerId] =
        useState<string | null>(null);
    const [qualityTargetId, setQualityTargetId] =
        useState("primary");
    const [dataQualityReport, setDataQualityReport] =
        useState<DataQualityReport | null>(null);
    const [selectedQualityIssueId, setSelectedQualityIssueId] =
        useState<string | null>(null);
    const [qualityScanning, setQualityScanning] =
        useState(false);
    const [qualityError, setQualityError] =
        useState<string | null>(null);
    const [cleanedDataset, setCleanedDataset] =
        useState<CleanedDatasetResult | null>(null);
    const [cleanedQualityReport, setCleanedQualityReport] =
        useState<DataQualityReport | null>(null);
    const [geoprocessingSummary, setGeoprocessingSummary] =
        useState<GeoprocessingRunSummary | null>(null);
    const [geoprocessingError, setGeoprocessingError] =
        useState<string | null>(null);
    const analysisLayerSequenceRef = useRef(0);
    const qualityScanSequenceRef = useRef(0);
    const agentHandledFilterClearRef = useRef(false);
    const skipNextFilterQueryInvalidationRef = useRef(false);
    const editHistory = useEditHistory(30);
    const geometryEditor = useGeometryEditor();
    const projectSnapshotInputRef =
        useRef<Omit<ProjectSnapshotInput, "project"> | null>(null);
    const persistenceBlockerRef = useRef<string | null>(null);
    const persistentReferencesRef = useRef<readonly unknown[] | null>(null);
    const skipNextPersistentDirtyRef = useRef(false);
    const [pendingFeatureId, setPendingFeatureId] =
        useState<string | null>(null);
    const [geometryValidationError, setGeometryValidationError] =
        useState<string | null>(null);
    const [geometryDeleteConfirmationOpen, setGeometryDeleteConfirmationOpen] =
        useState(false);
    const [geometryAbandonConfirmationOpen, setGeometryAbandonConfirmationOpen] =
        useState(false);
    const [searchResultFeature, setSearchResultFeature] =
        useState<SearchHighlightFeature | null>(null);
    const [searchLocation, setSearchLocation] =
        useState<[number, number] | null>(null);
    const [focusedLayerId, setFocusedLayerId] =
        useState<string | null>(null);
    const [mapCaptureRequestId, setMapCaptureRequestId] =
        useState<number | null>(null);
    const [reportSnapshotStatus, setReportSnapshotStatus] =
        useState<ReportSnapshotStatus>("idle");
    const [reportAiStatus, setReportAiStatus] =
        useState<ReportAiStatus>("idle");
    const [reportBuilderMessage, setReportBuilderMessage] =
        useState<string | null>(null);
    const mapCaptureSequenceRef = useRef(0);
    const mapCaptureResolverRef = useRef<
        ((result: MapCaptureResult) => void) | null
    >(null);
    const temporalCompareCaptureSequenceRef = useRef(0);
    const temporalCompareCaptureResolverRef = useRef<
        ((result: TemporalCompareCaptureResult) => void) | null
    >(null);

    useEffect(() => {
        if (aoiMode === "completed" && aoiPolygon) {
            setPersistedAoiFeature((current) =>
                areAoiFeaturesEqual(current, aoiPolygon)
                    ? current
                    : aoiPolygon,
            );
        }
    }, [aoiMode, aoiPolygon]);

    function handleClearSpatialQuery() {
        setSpatialQueryFeatures([]);
        setSpatialQueryResult(null);
        setSpatialQueryError(null);
    }

    function handleClearAoiQuery() {
        setAoiQueryFeatures([]);
        setAoiAnalysisResult(null);
        setAoiQueryError(null);
    }

    function handleStartAoi() {
        clearMeasure();
        handleClearAoiQuery();
        startAoi();
    }

    function handleRestartAoi() {
        handleClearAoiQuery();
        restartAoi();
    }

    function handleClearAoiAnalysis() {
        clearAoi();
        setPersistedAoiFeature(null);
        handleClearAoiQuery();
        setAoiRelation("intersects");
    }

    function handleAoiRelationChange(
        relation: AoiQueryRelation,
    ) {
        setAoiRelation(relation);
        handleClearAoiQuery();
    }

    function createSpatialQueryExecution(
        collection: LandUseFeatureCollection,
        geometry: Parameters<
            typeof queryFeaturesByGeometry
        >[1],
        relation: AoiQueryRelation,
    ) {
        const features = queryFeaturesByGeometry(
            collection,
            geometry,
            relation,
        );

        return {
            features,
            result: summarizeSpatialQuery(
                features,
                relation,
            ),
        };
    }

    function handleRunAoiQuery() {
        if (!aoiPolygon) {
            setAoiQueryError(
                "请先完成 AOI 范围绘制",
            );
            return;
        }

        try {
            const execution = createSpatialQueryExecution(
                filteredCollection,
                aoiPolygon,
                aoiRelation,
            );

            setAoiQueryFeatures(execution.features);
            setAoiAnalysisResult(execution.result);
            setAoiQueryError(null);
        } catch (error) {
            setAoiQueryFeatures([]);
            setAoiAnalysisResult(null);
            setAoiQueryError(
                error instanceof Error
                    ? error.message
                    : "AOI 空间查询失败",
            );
        }
    }

    const [
        shouldFitSelected,
        setShouldFitSelected,
    ] =
        useState(false);
    function handleFeatureSelect(
        feature:
            LandUseFeature | null,

        options?: {
            openFeaturePanel?:
            boolean;

            fitFeature?:
            boolean;

            multiSelect?:
            boolean;
        },
    ) {
        if (
            feature &&
            feature.properties.id !== selectedFeature?.properties.id
        ) {
            setBufferFeature(null);
            setBufferResult(null);
            setBufferError(null);
            handleClearSpatialQuery();
        }

        setSelectedFeature(
            feature,
        );


        if (!feature) {
            if (!options?.multiSelect) {
                setSelectedFeatureIds([]);
            }

            setActivePanel(
                (previous) =>
                    previous ===
                        "feature"
                        ? null
                        : previous,
            );

            return;
        }

        const featureId = feature.properties.id;

        setSelectedFeatureIds((previous) => {
            if (!options?.multiSelect) {
                return [featureId];
            }

            return previous.includes(featureId)
                ? previous.filter((id) => id !== featureId)
                : [...previous, featureId];
        });


        if (
            options?.openFeaturePanel !==
            false
        ) {
            setActivePanel(
                (previous) =>
                    previous ===
                        "table"
                        ? "table"
                        : "feature",
            );
        }


        if (
            options?.fitFeature
        ) {
            requestMapView(
                "fit-selected",
            );
        }
    }

    function handleCloseFeatureInfo() {
        setSelectedFeature(null,);
        setActivePanel(null,);
    }

    function handleTableFeatureSelect(
        feature:
            LandUseFeature,
    ) {
        if (
            feature.properties.id !== selectedFeature?.properties.id
        ) {
            setBufferFeature(null);
            setBufferResult(null);
            setBufferError(null);
            handleClearSpatialQuery();
        }

        setSelectedFeature(
            feature,
        );

        setSelectedFeatureIds([
            feature.properties.id,
        ]);


        setShouldFitSelected(
            true,
        );


        /*
         * 保持属性表开启。
         *
         * 不切换到 FeatureInfoPanel。
         */
    }

    function createBufferExecution(
        feature: LandUseFeature,
        distance: number,
    ) {
        const nextBufferFeature = createBuffer(
            feature,
            distance,
        );
        const areaM2 = calculateBufferAreaM2(
            nextBufferFeature,
        );

        return {
            feature: nextBufferFeature,
            result: {
                distance,
                unit: "meter" as const,
                areaM2,
                areaKm2: areaM2 / 1_000_000,
                featureCount: 1,
            },
        };
    }

    function handleCreateBuffer(
        feature: LandUseFeature,
        distance: number,
    ) {
        handleClearSpatialQuery();

        try {
            const execution = createBufferExecution(
                feature,
                distance,
            );

            setBufferFeature(execution.feature);
            setBufferResult(execution.result);
            setBufferError(null);
        } catch (error) {
            setBufferFeature(null);
            setBufferResult(null);
            setBufferError(
                error instanceof Error
                    ? error.message
                    : "缓冲区分析失败",
            );
        }
    }

    function handleRunSpatialQuery() {
        if (!bufferFeature) {
            setSpatialQueryError(
                "请先生成缓冲区，再执行空间查询",
            );
            return;
        }

        try {
            const relation = "intersects" as const;
            const execution = createSpatialQueryExecution(
                filteredCollection,
                bufferFeature,
                relation,
            );

            setSpatialQueryFeatures(execution.features);
            setSpatialQueryResult(execution.result);
            setSpatialQueryError(null);
        } catch (error) {
            setSpatialQueryFeatures([]);
            setSpatialQueryResult(null);
            setSpatialQueryError(
                error instanceof Error
                    ? error.message
                    : "空间查询失败",
            );
        }
    }

    function handleClearBuffer() {
        setBufferFeature(null);
        setBufferResult(null);
        setBufferError(null);
        handleClearSpatialQuery();
    }

    function resolveGeoprocessingInput(
        inputSource: GeoprocessingRunRequest["inputSource"],
    ): LandUseFeatureCollection {
        const features =
            inputSource === "aoi-query"
                ? aoiQueryFeatures
                : inputSource === "buffer-query"
                    ? spatialQueryFeatures
                    : filteredFeatures;

        return {
            type: "FeatureCollection",
            features,
        };
    }

    function getGeoprocessingLayerName(
        request: GeoprocessingRunRequest,
    ) {
        if (request.operation === "intersection") {
            return request.overlaySource === "aoi"
                ? "AOI Intersection"
                : "Buffer Intersection";
        }

        if (request.operation === "dissolve") {
            return request.dissolveField === "landUseType"
                ? "Dissolve by landUseType"
                : "Dissolve All";
        }

        return "Centroids";
    }

    function createGeoprocessingExecution(
        request: GeoprocessingRunRequest,
        inputCollection: LandUseFeatureCollection,
        overlays: {
            aoi: Parameters<
                typeof intersectFeaturesWithGeometry
            >[1] | null;
            buffer: BufferFeature | null;
        },
    ): GeoprocessingExecutionResult {
        if (inputCollection.features.length === 0) {
            throw new Error(
                "所选输入图层没有可处理的要素。",
            );
        }

        const startedAt = performance.now();
        let resultCollection:
            AnalysisResultFeatureCollection;

        if (request.operation === "intersection") {
            const overlay = request.overlaySource === "aoi"
                ? overlays.aoi
                : overlays.buffer;

            if (!overlay) {
                throw new Error(
                    request.overlaySource === "aoi"
                        ? "请先完成 AOI 绘制。"
                        : "请先创建 Buffer。",
                );
            }

            resultCollection = intersectFeaturesWithGeometry(
                inputCollection,
                overlay,
            );

            if (resultCollection.features.length === 0) {
                throw new Error(
                    "叠加范围与输入图层没有面积交集。",
                );
            }
        } else if (request.operation === "dissolve") {
            resultCollection = dissolveFeatures(
                inputCollection,
                request.dissolveField,
            );
        } else {
            resultCollection = createCentroids(
                inputCollection,
            );
        }

        const createdAt = Date.now();

        analysisLayerSequenceRef.current += 1;

        const layerId = [
            "analysis",
            request.operation,
            createdAt,
            analysisLayerSequenceRef.current,
        ].join("-");
        const layer: AnalysisResultLayer = {
            id: layerId,
            name: getGeoprocessingLayerName(request),
            operation: request.operation,
            geometryType: getAnalysisGeometryType(
                resultCollection,
            ),
            visible: true,
            createdAt,
            featureCount: resultCollection.features.length,
            collection: resultCollection,
        };

        return {
            layer,
            summary: {
                layerId,
                operation: request.operation,
                inputCount: inputCollection.features.length,
                outputCount: resultCollection.features.length,
                totalAreaM2:
                    request.operation === "intersection"
                        ? calculateAnalysisAreaM2(
                            resultCollection,
                        )
                        : undefined,
                elapsedMs: performance.now() - startedAt,
            },
        };
    }

    function handleRunGeoprocessing(
        request: GeoprocessingRunRequest,
    ) {
        const inputCollection =
            resolveGeoprocessingInput(
                request.inputSource,
            );

        try {
            const execution = createGeoprocessingExecution(
                request,
                inputCollection,
                {
                    aoi: aoiPolygon,
                    buffer: bufferFeature,
                },
            );

            setAnalysisResultLayers(
                (previous) => [
                    ...previous,
                    execution.layer,
                ],
            );
            setGeoprocessingSummary(execution.summary);
            setGeoprocessingError(null);
        } catch (error) {
            setGeoprocessingSummary(null);
            setGeoprocessingError(
                error instanceof Error
                    ? error.message
                    : "地理处理执行失败",
            );
        }
    }

    function handleAnalysisLayerVisibilityChange(
        layerId: string,
        visible: boolean,
    ) {
        setAnalysisResultLayers(
            (previous) => previous.map(
                (layer) =>
                    layer.id === layerId
                        ? {
                            ...layer,
                            visible,
                        }
                        : layer,
            ),
        );
    }

    function handleDeleteAnalysisLayer(
        layerId: string,
    ) {
        setAnalysisResultLayers(
            (previous) => previous.filter(
                (layer) => layer.id !== layerId,
            ),
        );
        setGeoprocessingSummary(
            (previous) =>
                previous?.layerId === layerId
                    ? null
                    : previous,
        );
        if (spatialStatisticsResultLayerId === layerId) {
            setSpatialStatisticsResultLayerId(null);
            setSpatialStatisticsSummary(null);
        }
    }

    function handleExportAnalysisLayer(
        layerId: string,
    ) {
        const layer = analysisResultLayers.find(
            (item) => item.id === layerId,
        );

        if (!layer) {
            return;
        }

        exportFeatureCollection(
            layer.collection,
            `geoinsight-${layer.operation}-${layer.createdAt}.geojson`,
        );
    }

    function getUniqueOverlayLayerName(
        requestedName: string,
        layers: readonly WorkspaceVectorLayer[],
    ) {
        const usedNames = new Set(
            layers.map(
                (layer) => layer.name.toLocaleLowerCase(),
            ),
        );

        if (!usedNames.has(requestedName.toLocaleLowerCase())) {
            return requestedName;
        }

        let suffix = 2;

        while (
            usedNames.has(
                `${requestedName} (${suffix})`
                    .toLocaleLowerCase(),
            )
        ) {
            suffix += 1;
        }

        return `${requestedName} (${suffix})`;
    }

    function addWorkspaceVectorLayer(layer: WorkspaceVectorLayer) {
        setOverlayLayers((previous) => {
            const layerName = getUniqueOverlayLayerName(layer.name, previous);

            return [
                ...previous,
                {
                    ...layer,
                    name: layerName,
                    style: createDefaultOverlayLayerStyle(
                        previous.length,
                        layer.geometryKind,
                    ),
                },
            ];
        });
        setOverlayImportError(null);
    }

    async function handleAddOverlayLayer(
        file: File,
    ) {
        const lowerCaseName = file.name.toLowerCase();

        setOverlayImportError(null);

        if (
            !lowerCaseName.endsWith(".geojson") &&
            !lowerCaseName.endsWith(".json")
        ) {
            setOverlayImportError(
                "仅支持 .geojson 或 .json 文件",
            );
            return;
        }

        setOverlayImporting(true);

        try {
            let text: string;

            try {
                text = await file.text();
            } catch {
                throw new Error("无法读取图层文件");
            }

            let raw: unknown;

            try {
                raw = JSON.parse(text);
            } catch {
                throw new Error("文件不是有效的 JSON");
            }

            const parsedLayer = parseOverlayGeoJson(
                raw,
                file.name,
                {
                    type: "local-geojson",
                    filename: file.name,
                },
            );

            addWorkspaceVectorLayer(parsedLayer);
            setActivePanel("layers");
        } catch (error) {
            setOverlayImportError(
                error instanceof Error
                    ? error.message
                    : "添加图层失败",
            );
        } finally {
            setOverlayImporting(false);
        }
    }

    function handleRemoveOverlayLayer(
        layerId: string,
    ) {
        setOverlayLayers(
            (previous) => previous.filter(
                (layer) => layer.id !== layerId,
            ),
        );

        if (qualityTargetId === layerId) {
            setQualityTargetId("primary");
            resetQualityResults();
        }
    }

    async function handleRefreshOverlayLayer(layerId: string) {
        const existingLayer = overlayLayers.find((layer) => layer.id === layerId);

        if (existingLayer?.origin?.type !== "geojson-url") {
            return;
        }

        setRefreshingOverlayLayerId(layerId);
        setOverlayImportError(null);

        try {
            const refreshedLayer = await fetchRemoteGeoJson(existingLayer.origin.url);

            setOverlayLayers((previous) => previous.map((layer) =>
                layer.id === layerId
                    ? {
                        ...layer,
                        geometryKind: refreshedLayer.geometryKind,
                        featureCount: refreshedLayer.featureCount,
                        collection: refreshedLayer.collection,
                    }
                    : layer,
            ));
            setSearchResultFeature(null);

            if (qualityTargetId === layerId) {
                resetQualityResults();
            }
        } catch (error) {
            setOverlayImportError(
                `${existingLayer.name} 刷新失败：${error instanceof Error ? error.message : "未知错误"}。旧数据已保留。`,
            );
        } finally {
            setRefreshingOverlayLayerId(null);
        }
    }

    function getUniqueRasterLayerName(
        requestedName: string,
        layers: readonly WorkspaceRasterLayer[],
    ) {
        const usedNames = new Set(layers.map((layer) => layer.name.toLocaleLowerCase()));
        const baseName = requestedName.trim() || "map-service";

        if (!usedNames.has(baseName.toLocaleLowerCase())) {
            return baseName;
        }

        let suffix = 2;
        while (usedNames.has(`${baseName} (${suffix})`.toLocaleLowerCase())) {
            suffix += 1;
        }

        return `${baseName} (${suffix})`;
    }

    function handleAddRasterLayer(layer: WorkspaceRasterLayer) {
        setRasterLayers((previous) => [
            ...previous,
            {
                ...layer,
                name: getUniqueRasterLayerName(layer.name, previous),
            },
        ]);
    }

    function handleRemoveRasterLayer(layerId: string) {
        setRasterLayers((previous) => previous.filter((layer) => layer.id !== layerId));
    }

    function handleToggleRasterLayer(layerId: string, visible: boolean) {
        setRasterLayers((previous) => previous.map((layer) =>
            layer.id === layerId ? { ...layer, visible } : layer,
        ));
    }

    function handleRasterOpacityChange(layerId: string, opacity: number) {
        const normalizedOpacity = Math.min(1, Math.max(0, opacity));
        setRasterLayers((previous) => previous.map((layer) =>
            layer.id === layerId ? { ...layer, opacity: normalizedOpacity } : layer,
        ));
    }

    function moveRasterLayer(layerId: string, offset: -1 | 1) {
        setRasterLayers((previous) => {
            const currentIndex = previous.findIndex((layer) => layer.id === layerId);
            const nextIndex = currentIndex + offset;

            if (currentIndex < 0 || nextIndex < 0 || nextIndex >= previous.length) {
                return previous;
            }

            const nextLayers = [...previous];
            [nextLayers[currentIndex], nextLayers[nextIndex]] = [
                nextLayers[nextIndex],
                nextLayers[currentIndex],
            ];
            return nextLayers;
        });
    }

    function handleToggleOverlayLayer(
        layerId: string,
        visible: boolean,
    ) {
        setOverlayLayers(
            (previous) => previous.map(
                (layer) =>
                    layer.id === layerId
                        ? {
                            ...layer,
                            style: {
                                ...layer.style,
                                visible,
                            },
                        }
                        : layer,
            ),
        );
    }

    function handleOverlayOpacityChange(
        layerId: string,
        opacity: number,
    ) {
        const normalizedOpacity = Math.min(
            1,
            Math.max(0, opacity),
        );

        setOverlayLayers(
            (previous) => previous.map(
                (layer) =>
                    layer.id === layerId
                        ? {
                            ...layer,
                            style: {
                                ...layer.style,
                                opacity: normalizedOpacity,
                            },
                        }
                        : layer,
            ),
        );
    }

    function handleOverlayStyleChange(
        layerId: string,
        style: Partial<OverlayLayerStyle>,
    ) {
        setOverlayLayers(
            (previous) => previous.map(
                (layer) =>
                    layer.id === layerId
                        ? {
                            ...layer,
                            style: {
                                ...layer.style,
                                ...style,
                            },
                        }
                        : layer,
            ),
        );
    }

    function moveOverlayLayer(
        layerId: string,
        offset: -1 | 1,
    ) {
        setOverlayLayers((previous) => {
            const currentIndex = previous.findIndex(
                (layer) => layer.id === layerId,
            );
            const nextIndex = currentIndex + offset;

            if (
                currentIndex < 0 ||
                nextIndex < 0 ||
                nextIndex >= previous.length
            ) {
                return previous;
            }

            const nextLayers = [...previous];
            const currentLayer = nextLayers[currentIndex];

            nextLayers[currentIndex] = nextLayers[nextIndex];
            nextLayers[nextIndex] = currentLayer;

            return nextLayers;
        });
    }

    function handleMoveOverlayLayerUp(
        layerId: string,
    ) {
        moveOverlayLayer(layerId, -1);
    }

    function handleMoveOverlayLayerDown(
        layerId: string,
    ) {
        moveOverlayLayer(layerId, 1);
    }

    function handleFitOverlayLayer(
        layerId: string,
    ) {
        setMapViewCommand((previous) => ({
            type: "fit-overlay",
            layerId,
            requestId: (previous?.requestId ?? 0) + 1,
        }));
    }

    function handleExportOverlayLayer(
        layerId: string,
    ) {
        const layer = overlayLayers.find(
            (item) => item.id === layerId,
        );

        if (!layer) {
            return;
        }

        const safeName = layer.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
            .replace(/^-|-$/g, "") || "overlay";

        exportFeatureCollection(
            layer.collection,
            `geoinsight-${safeName}-${Date.now()}.geojson`,
        );
    }

    useEffect(() => {
        if (
            !selectedFeature
        ) {
            return;
        }


        const stillVisible =
            filteredFeatures.some(
                (feature) =>
                    feature.properties.id ===
                    selectedFeature
                        .properties.id,
            );


        if (stillVisible) {
            return;
        }


        setSelectedFeature(
            null,
        );

        setActivePanel(
            (previous) =>
                previous === "feature"
                    ? null
                    : previous,
        );
    }, [
        filteredFeatures,
        selectedFeature,
    ]);

    useEffect(() => {
        if (!selectedFeature || !state.dataset) {
            return;
        }

        const currentFeature = state.dataset.collection.features.find(
            (feature) =>
                feature.properties.id === selectedFeature.properties.id,
        );

        if (!currentFeature) {
            setSelectedFeature(null);
            return;
        }

        if (currentFeature !== selectedFeature) {
            setSelectedFeature(currentFeature);
        }
    }, [selectedFeature, state.dataset]);

    useEffect(() => {
        if (pendingProject) {
            return;
        }

        if (skipNextFilterQueryInvalidationRef.current) {
            skipNextFilterQueryInvalidationRef.current = false;
            return;
        }

        if (agentHandledFilterClearRef.current) {
            agentHandledFilterClearRef.current = false;
            return;
        }

        setSpatialQueryFeatures([]);
        setSpatialQueryResult(null);
        setSpatialQueryError(null);
        setAoiQueryFeatures([]);
        setAoiAnalysisResult(null);
        setAoiQueryError(null);
    }, [
        filteredFeatures,
        pendingProject,
    ]);

    useEffect(() => {
        if (
            !selectedFeature ||
            !shouldFitSelected
        ) {
            return;
        }


        requestMapView(
            "fit-selected",
        );


        setShouldFitSelected(
            false,
        );
    }, [
        selectedFeature,
        shouldFitSelected,
    ]);

    const [lastAgentSnapshot, setLastAgentSnapshot] =
        useState<AgentSnapshot | null>(null);
    const [agentExecutionEvents, setAgentExecutionEvents] =
        useState<AgentExecutionEvent[]>([]);

    const requestedPanel = searchParams.get("panel");

    useEffect(() => {
        if (requestedPanel === "agent" || requestedPanel === "report-builder") {
            setActivePanel(requestedPanel);
            return;
        }
        setActivePanel((previousPanel) => {
            return previousPanel === "agent" || previousPanel === "report-builder"
                ? null
                : previousPanel;
        });
    }, [requestedPanel]);

    function handleCloseAgent() {
        setActivePanel(null);
        const nextParams =
            new URLSearchParams(searchParams,);
        nextParams.delete("panel",);

        setSearchParams(
            nextParams,
            {
                replace: true,
            },);
    }

    // GeoJSON 导出
    function handleExportGeoJSON() {
        if (filteredFeatures.length === 0) {
            return;
        }

        exportFeatureCollection(
            {
                type: "FeatureCollection",
                features: filteredFeatures,
            },
            `geoinsight-filtered-${Date.now()}.geojson`,
        );
    }

    function handleExportAoiGeoJson() {
        if (!aoiAnalysisResult) {
            return;
        }

        const collection: LandUseFeatureCollection = {
            type: "FeatureCollection",
            features: aoiQueryFeatures,
        };
        exportFeatureCollection(
            collection,
            `geoinsight-aoi-${aoiRelation}-${Date.now()}.geojson`,
        );
    }

    function handleExportAoiCsv() {
        if (!aoiAnalysisResult) {
            return;
        }

        downloadLandUseCsv(
            aoiQueryFeatures,
            `geoinsight-aoi-result-${Date.now()}.csv`,
        );
    }
    function handlePanelToggle(panel: Exclude<WorkspacePanel, null>,) {
        if (
            temporalCompareConfig.enabled &&
            panel !== "temporal-compare" &&
            panel !== "basemap" &&
            panel !== "report-builder"
        ) {
            setTemporalCompareError("请先退出时序对比模式。 ");
            setActivePanel("temporal-compare");
            return;
        }

        if (geometryEditor.mode !== "idle") {
            setGeometryAbandonConfirmationOpen(true);
            return;
        }

        setActivePanel(
            // 新值依赖于旧值
            (previousPanel) => {
                return previousPanel === panel
                    ? null
                    : panel;
            },
        );

        if (searchParams.has("panel")) {
            const nextParams =
                new URLSearchParams(searchParams,);

            nextParams.delete("panel",);

            setSearchParams(
                nextParams,
                {
                    replace: true,
                },
            );
        }
    }
    const sidePanelOpen =
        activePanel !== null;

    // 图层样式
    const [layerStyle, setLayerStyle] =
        useState<LayerStyle>({
            ...DEFAULT_LAYER_STYLE,
        });

    // 泛型 ：Key extends keyof LayerStyle表示：Key必须是其中一个合法属性名
    // 泛型实际价值：让key和value的类型保持关联
    function updateLayerStyle<Key extends keyof LayerStyle>(key: Key, value: LayerStyle[Key],) {
        setLayerStyle((previous) => {
            return {
                ...previous,
                [key]: value,
            };
        });
    }

    // 重置风格
    function handleResetStyle() {
        setLayerStyle({
            ...DEFAULT_LAYER_STYLE,
        });
    }

    // 应用预设
    function handleApplyPreset(presetStyle: Partial<LayerStyle>) {
        setLayerStyle((previous) => {
            return {
                ...previous,
                ...presetStyle,
            };
        });
    }

    // 保存样式修改
    const [savedLayerStyle, setSavedLayerStyle,] =
        useState<LayerStyle>({
            ...DEFAULT_LAYER_STYLE,
        });
    // 展开运算符算深拷贝吗？
    // 不是，只复制第一层，嵌套引用仍然共享
    function handleSaveStyle() {
        setSavedLayerStyle({
            ...layerStyle,
        });
    }

    const hasUnsavedChanges =
        JSON.stringify(layerStyle) !==
        JSON.stringify(savedLayerStyle);


    const dataset = state.dataset;
    const temporalCandidates = useMemo(
        () => dataset ? detectTemporalFields(dataset.collection) : [],
        [dataset],
    );
    const temporalFeatures = useMemo(
        () => filterFeaturesByTemporalConfig(filteredFeatures, temporalConfig),
        [filteredFeatures, temporalConfig],
    );
    const temporalValues = useMemo(
        () => getAvailableTemporalValues(filteredFeatures, temporalConfig),
        [filteredFeatures, temporalConfig],
    );
    const temporalCompareValues = useMemo(
        () => getAvailableTemporalValues(
            dataset?.collection.features ?? [],
            temporalConfig,
        ),
        [dataset, temporalConfig],
    );
    useEffect(() => {
        if (
            !temporalConfig.enabled ||
            temporalValues.length === 0 ||
            temporalValues.includes(temporalConfig.current)
        ) {
            return;
        }

        setTemporalConfig((previous) => ({
            ...previous,
            current: temporalValues[temporalValues.length - 1],
        }));
    }, [
        temporalConfig,
        temporalValues,
    ]);
    useEffect(() => {
        if (temporalCompareValues.length < 2) {
            if (temporalCompareConfig.enabled) {
                setTemporalCompareConfig((previous) => ({
                    ...previous,
                    enabled: false,
                }));
                setTemporalCompareError(
                    "当前数据至少需要两个时间点才能进行时序对比。",
                );
            }
            return;
        }

        const hasBefore = temporalCompareValues.includes(
            temporalCompareConfig.beforeTime,
        );
        const hasAfter = temporalCompareValues.includes(
            temporalCompareConfig.afterTime,
        );

        if (hasBefore && hasAfter) {
            return;
        }

        setTemporalCompareConfig((previous) => ({
            ...previous,
            enabled: false,
            beforeTime: temporalCompareValues[0],
            afterTime: temporalCompareValues[temporalCompareValues.length - 1],
        }));
    }, [
        temporalCompareConfig.afterTime,
        temporalCompareConfig.beforeTime,
        temporalCompareConfig.enabled,
        temporalCompareValues,
    ]);
    const temporalStatistics = useMemo(
        () => temporalConfig.enabled
            ? calculateTemporalStatistics(filteredFeatures, temporalConfig)
            : null,
        [filteredFeatures, temporalConfig],
    );
    const temporalChange = useMemo(
        () => temporalConfig.enabled
            ? calculateTemporalChange(filteredFeatures, temporalConfig)
            : null,
        [filteredFeatures, temporalConfig],
    );
    const temporalBufferQueryFeatures = useMemo(
        () => filterFeaturesByTemporalConfig(spatialQueryFeatures, temporalConfig),
        [spatialQueryFeatures, temporalConfig],
    );
    const temporalAoiQueryFeatures = useMemo(
        () => filterFeaturesByTemporalConfig(aoiQueryFeatures, temporalConfig),
        [aoiQueryFeatures, temporalConfig],
    );
    const spatialStatisticsSources = useMemo(() => {
        const sources = new Map<string, {
            collection: SpatialStatisticsFeatureCollection;
            sourceLayerId: string;
            input: SpatialStatisticsInput;
            label: string;
        }>();

        sources.set("filtered-primary", {
            collection: {
                type: "FeatureCollection",
                features: temporalFeatures,
            },
            sourceLayerId: dataset?.id ?? "primary",
            input: "filtered-primary",
            label: temporalConfig.enabled
                ? "当前筛选结果（含时间切片）"
                : "当前筛选结果",
        });

        if (spatialQueryResult) {
            sources.set("buffer-query", {
                collection: {
                    type: "FeatureCollection",
                    features: temporalBufferQueryFeatures,
                },
                sourceLayerId: "buffer-query",
                input: "buffer-query",
                label: "Buffer 查询结果",
            });
        }

        if (aoiAnalysisResult) {
            sources.set("aoi-query", {
                collection: {
                    type: "FeatureCollection",
                    features: temporalAoiQueryFeatures,
                },
                sourceLayerId: "aoi-query",
                input: "aoi-query",
                label: "AOI 查询结果",
            });
        }

        overlayLayers
            .filter((layer) => layer.geometryKind === "point")
            .forEach((layer) => {
                const input = {
                    type: "overlay" as const,
                    layerId: layer.id,
                };
                sources.set(getSpatialStatisticsInputKey(input), {
                    collection: layer.collection,
                    sourceLayerId: layer.id,
                    input,
                    label: layer.name,
                });
            });

        return sources;
    }, [
        aoiAnalysisResult,
        dataset?.id,
        overlayLayers,
        spatialQueryResult,
        temporalAoiQueryFeatures,
        temporalBufferQueryFeatures,
        temporalConfig.enabled,
        temporalFeatures,
    ]);
    const spatialStatisticsInputOptions = useMemo<SpatialStatisticsInputOption[]>(
        () => [...spatialStatisticsSources.entries()].map(([key, source]) => ({
            key,
            input: source.input,
            label: source.label,
            featureCount: source.collection.features.length,
            supportsAreaWeight: supportsAreaWeight(source.collection),
        })),
        [spatialStatisticsSources],
    );
    const resolveSpatialStatisticsInput = useCallback(
        (input: SpatialStatisticsInput) => {
            const source = spatialStatisticsSources.get(
                getSpatialStatisticsInputKey(input),
            );

            if (source) {
                return source;
            }

            if (input === "buffer-query") {
                throw new Error("当前没有可用的 Buffer 查询结果。");
            }

            if (input === "aoi-query") {
                throw new Error("当前没有可用的 AOI 查询结果。");
            }

            if (typeof input !== "string") {
                throw new Error("所选 Point Overlay 已被删除或不可用。");
            }

            throw new Error("当前筛选结果不可用。");
        },
        [spatialStatisticsSources],
    );

    useEffect(() => {
        if (!activeHeatmapRequest) {
            return;
        }

        try {
            const source = resolveSpatialStatisticsInput(activeHeatmapRequest.input);
            const analysis = createHeatmapAnalysis(source.collection, {
                sourceLayerId: source.sourceLayerId,
                weightMode: activeHeatmapRequest.config.weightMode,
            });

            setSpatialStatisticsConfig(activeHeatmapRequest.config);
            setSpatialHeatmapData(analysis.points);
            setSpatialStatisticsSummary(analysis.summary);
            setSpatialStatisticsError(null);
            setSpatialStatisticsResultLayerId(null);
        } catch (error) {
            setSpatialHeatmapData(null);
            setSpatialStatisticsSummary(null);
            setSpatialStatisticsError(
                error instanceof Error ? error.message : "密度热力图生成失败。",
            );
        } finally {
            setSpatialStatisticsAnalyzing(false);
        }
    }, [activeHeatmapRequest, resolveSpatialStatisticsInput]);

    async function handleRunSpatialStatistics(request: SpatialStatisticsRunRequest) {
        setSpatialStatisticsError(null);
        setSpatialStatisticsAnalyzing(true);

        if (request.config.method === "heatmap") {
            setActiveHeatmapRequest(request);
            return;
        }

        await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
        });

        try {
            const source = resolveSpatialStatisticsInput(request.input);
            const analysis = createHexbinAnalysis(source.collection, {
                sourceLayerId: source.sourceLayerId,
                weightMode: request.config.weightMode,
                cellSizeKm: request.config.cellSizeKm,
            });
            const createdAt = Date.now();
            const temporalLabel = temporalConfig.enabled
                ? ` · ${temporalConfig.current}`
                : "";
            const weightLabel = request.config.weightMode === "area"
                ? "Area"
                : "Count";
            const layerId = `analysis-spatial-hexbin-${createdAt}-${crypto.randomUUID()}`;
            const layer: AnalysisResultLayer = {
                id: layerId,
                name: `空间热点${temporalLabel} · ${request.config.cellSizeKm} km · ${weightLabel}`,
                operation: "spatial-hexbin",
                geometryType: "Polygon",
                visible: true,
                createdAt,
                featureCount: analysis.collection.features.length,
                collection: analysis.collection,
                metadata: {
                    method: "hexbin",
                    inputSource: request.input,
                    weightMode: request.config.weightMode,
                    cellSizeKm: request.config.cellSizeKm,
                    ...(temporalConfig.enabled
                        ? { temporalValue: temporalConfig.current }
                        : {}),
                    createdFromFeatureCount: analysis.summary.inputFeatureCount,
                },
            };

            setAnalysisResultLayers((previous) => [...previous, layer]);
            setSpatialStatisticsConfig(request.config);
            setSpatialStatisticsSummary(analysis.summary);
            setSpatialStatisticsResultLayerId(layerId);
            setSpatialStatisticsError(null);
            setSpatialHeatmapData(null);
            setActiveHeatmapRequest(null);
        } catch (error) {
            setSpatialStatisticsSummary(null);
            setSpatialStatisticsError(
                error instanceof Error ? error.message : "六边形聚合分析失败。",
            );
        } finally {
            setSpatialStatisticsAnalyzing(false);
        }
    }

    function handleClearSpatialHeatmap() {
        setActiveHeatmapRequest(null);
        setSpatialHeatmapData(null);

        if (spatialStatisticsSummary?.method === "heatmap") {
            setSpatialStatisticsSummary(null);
        }
    }

    function handleFitSpatialHotspot(cellId: string) {
        if (!spatialStatisticsResultLayerId) {
            return;
        }

        setMapViewCommand((previous) => ({
            type: "fit-spatial-cell",
            requestId: (previous?.requestId ?? 0) + 1,
            layerId: spatialStatisticsResultLayerId,
            cellId,
        }));
    }
    const qualitySourceCollection = useMemo<
        DataQualityFeatureCollection | null
    >(
        () => {
            if (qualityTargetId === "primary") {
                return state.dataset?.collection ?? null;
            }

            return overlayLayers.find(
                (layer) => layer.id === qualityTargetId,
            )?.collection ?? null;
        },
        [overlayLayers, qualityTargetId, state.dataset],
    );
    const qualityIssueFeatures = useMemo<
        DataQualityMapFeatureCollection
    >(
        () => {
            if (!qualitySourceCollection || !dataQualityReport) {
                return {
                    type: "FeatureCollection",
                    features: [],
                };
            }

            return createDataQualityMapCollection(
                qualitySourceCollection,
                dataQualityReport,
            );
        },
        [dataQualityReport, qualitySourceCollection],
    );
    const filteredCollection =
        useMemo<LandUseFeatureCollection>(
            () => {
                return {
                    type: "FeatureCollection",
                    features: filteredFeatures,
                };
            },
            [filteredFeatures],
        );
    const temporalCollection = useMemo<LandUseFeatureCollection>(
        () => ({
            type: "FeatureCollection",
            features: temporalFeatures,
        }),
        [temporalFeatures],
    );
    const temporalCompareBeforeCollection = useMemo(
        () => filterCollectionAtTemporalValue(
            filteredCollection,
            temporalConfig,
            temporalCompareConfig.beforeTime,
        ),
        [
            filteredCollection,
            temporalCompareConfig.beforeTime,
            temporalConfig,
        ],
    );
    const temporalCompareAfterCollection = useMemo(
        () => filterCollectionAtTemporalValue(
            filteredCollection,
            temporalConfig,
            temporalCompareConfig.afterTime,
        ),
        [
            filteredCollection,
            temporalCompareConfig.afterTime,
            temporalConfig,
        ],
    );
    const temporalCompareSummary = useMemo(
        () => temporalConfig.enabled && temporalCompareValues.length >= 2
            ? calculateTemporalComparison(
                temporalCompareBeforeCollection,
                temporalCompareAfterCollection,
                temporalCompareConfig.beforeTime,
                temporalCompareConfig.afterTime,
            )
            : null,
        [
            temporalCompareAfterCollection,
            temporalCompareBeforeCollection,
            temporalCompareConfig.afterTime,
            temporalCompareConfig.beforeTime,
            temporalCompareValues.length,
            temporalConfig.enabled,
        ],
    );
    const geometryDraft = useMemo(
        () => createClosedPolygonGeometry(
            geometryEditor.draftCoordinates,
        ),
        [geometryEditor.draftCoordinates],
    );
    const geometryDraftAreaM2 = useMemo(
        () => geometryDraft
            ? calculateEditedGeometryAreaM2(geometryDraft)
            : null,
        [geometryDraft],
    );
    const geometrySnapCandidates = useMemo(
        () => extractPolygonVertices(filteredCollection, {
            excludeFeatureId: geometryEditor.mode === "editing"
                ? geometryEditor.editingFeatureId
                : null,
        }),
        [
            filteredCollection,
            geometryEditor.editingFeatureId,
            geometryEditor.mode,
        ],
    );
    const selectedFeatures = useMemo(
        () => {
            const selectedIds = new Set(selectedFeatureIds);

            return state.dataset?.collection.features.filter(
                (feature) => selectedIds.has(feature.properties.id),
            ) ?? [];
        },
        [selectedFeatureIds, state.dataset],
    );

    const graduatedClasses = useMemo(
        () => {
            if (
                layerStyle.symbologyMode !==
                "graduated"
            ) {
                return [];
            }

            return createGraduatedClasses(
                temporalFeatures,
                {
                    field:
                        layerStyle.graduatedField,
                    method:
                        layerStyle.classificationMethod,
                    classCount:
                        layerStyle.classCount,
                    colors: getColorRampColors(
                        layerStyle.colorRamp,
                        layerStyle.classCount,
                    ),
                },
            );
        },
        [
            temporalFeatures,
            layerStyle.symbologyMode,
            layerStyle.graduatedField,
            layerStyle.classificationMethod,
            layerStyle.classCount,
            layerStyle.colorRamp,
        ],
    );

    const thematicLayerStyle = useMemo<LayerStyle>(
        () => ({
            ...layerStyle,
            graduatedClasses,
        }),
        [
            layerStyle,
            graduatedClasses,
        ],
    );

    const temporalCompareLayerStyle = useMemo<LayerStyle>(() => {
        if (layerStyle.symbologyMode !== "graduated") {
            return thematicLayerStyle;
        }

        const sharedClasses = createGraduatedClasses(
            [
                ...temporalCompareBeforeCollection.features,
                ...temporalCompareAfterCollection.features,
            ],
            {
                field: layerStyle.graduatedField,
                method: layerStyle.classificationMethod,
                classCount: layerStyle.classCount,
                colors: getColorRampColors(
                    layerStyle.colorRamp,
                    layerStyle.classCount,
                ),
            },
        );

        return {
            ...layerStyle,
            graduatedClasses: sharedClasses,
        };
    }, [
        layerStyle,
        temporalCompareAfterCollection.features,
        temporalCompareBeforeCollection.features,
        thematicLayerStyle,
    ]);

    const createTemporalCompareSnapshot = useCallback((
        capture: TemporalCompareCaptureResult,
    ): TemporalCompareSnapshot | null => {
        if (!temporalCompareSummary) {
            return null;
        }

        return {
            beforeTime: temporalCompareConfig.beforeTime,
            afterTime: temporalCompareConfig.afterTime,
            layout: temporalCompareConfig.layout,
            summary: temporalCompareSummary,
            beforeMap: capture.before,
            afterMap: capture.after,
            capturedAt: Date.now(),
        };
    }, [
        temporalCompareConfig.afterTime,
        temporalCompareConfig.beforeTime,
        temporalCompareConfig.layout,
        temporalCompareSummary,
    ]);

    const handleTemporalCompareCapture = useCallback((
        result: TemporalCompareCaptureResult,
    ) => {
        if (result.requestId !== temporalCompareCaptureSequenceRef.current) {
            return;
        }

        temporalCompareCaptureResolverRef.current?.(result);
        temporalCompareCaptureResolverRef.current = null;
        setTemporalCompareCaptureRequestId(null);
    }, []);

    function requestTemporalCompareCapture() {
        return new Promise<TemporalCompareCaptureResult>((resolve) => {
            temporalCompareCaptureResolverRef.current?.({
                requestId: temporalCompareCaptureSequenceRef.current,
                before: { dataUrl: null, error: "新的捕获请求已替换上一次请求。" },
                after: { dataUrl: null, error: "新的捕获请求已替换上一次请求。" },
            });
            temporalCompareCaptureSequenceRef.current += 1;
            temporalCompareCaptureResolverRef.current = resolve;
            setTemporalCompareCaptureRequestId(
                temporalCompareCaptureSequenceRef.current,
            );
        });
    }

    async function handleCaptureTemporalCompareSnapshot() {
        if (!temporalCompareConfig.enabled || !temporalCompareSummary) {
            setTemporalCompareError("请先进入时序对比。 ");
            return;
        }

        setTemporalCompareCapturing(true);
        setTemporalCompareError(null);
        try {
            const capture = await requestTemporalCompareCapture();
            const snapshot = createTemporalCompareSnapshot(capture);
            setTemporalCompareSnapshot(snapshot);

            if (!capture.before.dataUrl && !capture.after.dataUrl) {
                setTemporalCompareError(
                    "两侧地图快照均不可用，统计对比仍可用于报告。",
                );
            }
        } finally {
            setTemporalCompareCapturing(false);
        }
    }

    function handleEnterTemporalCompare() {
        if (!temporalConfig.enabled) {
            setTemporalCompareError("请先启用时间分析。 ");
            return;
        }
        if (temporalCompareValues.length < 2) {
            setTemporalCompareError("当前数据至少需要两个时间点才能进行时序对比。 ");
            return;
        }
        if (temporalCompareConfig.beforeTime >= temporalCompareConfig.afterTime) {
            setTemporalCompareError("后期时间应晚于前期时间。 ");
            return;
        }

        clearMeasure();
        setTemporalCompareError(null);
        setTemporalCompareSnapshot(null);
        setTemporalCompareConfig((previous) => ({
            ...previous,
            enabled: true,
            syncCamera: previous.layout === "swipe" ? true : previous.syncCamera,
        }));
        setActivePanel("temporal-compare");
    }

    function handleExitTemporalCompare() {
        setRestoreViewState((previous) => ({
            requestId: (previous?.requestId ?? 0) + 1,
            state: {
                ...projectMapState,
                basemap,
            },
        }));
        setTemporalCompareConfig((previous) => ({
            ...previous,
            enabled: false,
        }));
        setTemporalCompareCapturing(false);
        setTemporalCompareCaptureRequestId(null);
    }

    function requestReportMapCapture() {
        return new Promise<MapCaptureResult>((resolve) => {
            mapCaptureResolverRef.current?.({
                requestId: mapCaptureSequenceRef.current,
                dataUrl: null,
                error: "新的地图捕获请求已替换上一次请求。",
            });
            mapCaptureSequenceRef.current += 1;
            mapCaptureResolverRef.current = resolve;
            setMapCaptureRequestId(mapCaptureSequenceRef.current);
        });
    }

    function handleMapCapture(result: MapCaptureResult) {
        if (result.requestId !== mapCaptureSequenceRef.current) {
            return;
        }

        mapCaptureResolverRef.current?.(result);
        mapCaptureResolverRef.current = null;
        setMapCaptureRequestId(null);
    }

    async function handleGenerateReportSnapshot(
        config: ReportBuilderConfig,
    ) {
        if (!dataset) {
            setReportSnapshotStatus("error");
            setReportBuilderMessage("当前没有可生成报告的主数据集。");
            return;
        }

        if (geometryEditor.mode !== "idle") {
            setReportSnapshotStatus("error");
            setReportBuilderMessage("请先保存或取消当前几何编辑。");
            return;
        }

        setReportSnapshotStatus("capturing");
        setReportBuilderMessage("正在捕获地图并生成分析快照...");

        try {
            let comparisonSnapshot = temporalCompareSnapshot;
            let mapCapture: MapCaptureResult;

            if (temporalCompareConfig.enabled) {
                const comparisonCapture = await requestTemporalCompareCapture();
                comparisonSnapshot = createTemporalCompareSnapshot(
                    comparisonCapture,
                );
                setTemporalCompareSnapshot(comparisonSnapshot);
                mapCapture = {
                    requestId: comparisonCapture.requestId,
                    dataUrl: comparisonCapture.after.dataUrl ??
                        comparisonCapture.before.dataUrl,
                    error: comparisonCapture.after.dataUrl ||
                        comparisonCapture.before.dataUrl
                        ? null
                        : comparisonCapture.after.error ??
                            comparisonCapture.before.error,
                };
            } else {
                mapCapture = await requestReportMapCapture();
            }
            const snapshot = createReportSnapshot({
                projectName: projectMeta?.name ?? "未命名工程",
                workspaceRevision,
                dataset,
                filteredFeatures: temporalFeatures,
                filters: state.filters,
                attributeQuery: state.attributeQuery,
                selectedFeatureIds,
                bufferResult,
                spatialQueryResult,
                aoiAnalysisResult,
                analysisResultLayers,
                dataQualityReport,
                layerStyle: thematicLayerStyle,
                temporalConfig,
                spatialStatistics: spatialStatisticsSummary
                    ? {
                        config: spatialStatisticsConfig,
                        summary: spatialStatisticsSummary,
                    }
                    : null,
                temporalComparison: comparisonSnapshot,
                mapState: { ...projectMapState, basemap },
                mapCapture: {
                    dataUrl: mapCapture.dataUrl,
                    error: mapCapture.error,
                },
            });
            const fallback = generateDeterministicInsights(snapshot);

            setReportDraft({
                id: reportDraft?.id ?? crypto.randomUUID(),
                title: config.title,
                subtitle: config.subtitle,
                author: config.author,
                snapshot,
                sections: config.sections.map((section) => ({ ...section })),
                executiveSummary: fallback.executiveSummary,
                insights: fallback.insights.map((insight) => ({
                    ...insight,
                    id: crypto.randomUUID(),
                })),
                aiGenerated: false,
            });
            setReportAiStatus("idle");
            setReportSnapshotStatus("ready");
            setReportBuilderMessage(
                mapCapture.error
                    ? `分析快照已生成；${mapCapture.error}`
                    : "分析快照与地图已生成。",
            );
        } catch (error) {
            setReportSnapshotStatus("error");
            setReportBuilderMessage(
                error instanceof Error
                    ? error.message
                    : "无法生成分析快照。",
            );
        }
    }

    async function handleGenerateReportAiInsights() {
        if (!reportDraft) {
            return;
        }

        const snapshotId = reportDraft.snapshot.id;
        setReportAiStatus("generating");
        setReportBuilderMessage("正在根据结构化统计摘要生成 AI 洞察...");

        try {
            const response = await generateReportInsights(
                createAIReportContext(reportDraft.snapshot),
            );

            setReportDraft((current) => {
                if (!current || current.snapshot.id !== snapshotId) {
                    return current;
                }

                return {
                    ...current,
                    executiveSummary: response.executiveSummary,
                    insights: response.insights.map((insight) => ({
                        ...insight,
                        id: crypto.randomUUID(),
                    })),
                    aiGenerated: true,
                };
            });
            setReportAiStatus("ready");
            setReportBuilderMessage(
                `AI 洞察已生成，共 ${response.insights.length} 条。`,
            );
        } catch (error) {
            setReportAiStatus("error");
            setReportBuilderMessage(
                `${error instanceof Error ? error.message : "AI 洞察生成失败。"} 已保留基础统计结论。`,
            );
        }
    }

    const workspaceSearchIndex = useMemo(
        () => buildWorkspaceSearchIndex(
            dataset,
            overlayLayers,
            analysisResultLayers,
            rasterLayers,
        ),
        [analysisResultLayers, dataset, overlayLayers, rasterLayers],
    );

    function openWorkspacePanelFromSearch(
        panel: Exclude<WorkspacePanel, null>,
    ) {
        if (
            temporalCompareConfig.enabled &&
            panel !== "temporal-compare" &&
            panel !== "basemap" &&
            panel !== "report-builder"
        ) {
            setTemporalCompareError("请先退出时序对比模式。 ");
            setActivePanel("temporal-compare");
            return false;
        }

        if (
            geometryEditor.mode !== "idle" &&
            panel !== "geometry-edit"
        ) {
            return false;
        }

        setActivePanel(panel);
        const nextParams = new URLSearchParams(searchParams);

        if (panel === "agent") {
            nextParams.set("panel", "agent");
        } else {
            nextParams.delete("panel");
        }

        setSearchParams(nextParams, { replace: true });
        return true;
    }

    function getWorkspaceCommandDisabledReason(
        commandId: WorkspaceCommandId,
    ) {
        const command = getWorkspaceCommand(commandId);

        if (!command) {
            return "当前命令不可用";
        }

        if (command.requiredState === "dataset" && !dataset) {
            return "请先导入主数据集";
        }

        if (
            command.requiredState === "selection" &&
            selectedFeatureIds.length === 0
        ) {
            return "请先选择地块";
        }

        if (
            geometryEditor.mode !== "idle" &&
            commandId !== "open-geometry-editor" &&
            (commandId.startsWith("open-") ||
                commandId.startsWith("navigate-"))
        ) {
            return "请先保存或取消当前几何编辑";
        }

        if (
            temporalCompareConfig.enabled &&
            commandId !== "open-basemap" &&
            commandId !== "open-report-builder" &&
            commandId !== "open-temporal-compare"
        ) {
            return "请先退出时序对比模式";
        }

        return null;
    }

    function getWorkspaceSearchDisabledReason(
        result: WorkspaceSearchResult,
    ) {
        if (result.type === "command") {
            return getWorkspaceCommandDisabledReason(result.commandId);
        }

        if (temporalCompareConfig.enabled) {
            return "请先退出时序对比模式";
        }

        if (result.type === "coordinate") {
            return null;
        }

        if (geometryEditor.mode !== "idle") {
            return "请先保存或取消当前几何编辑";
        }

        if (!dataset) {
            return "请先导入主数据集";
        }

        if (result.type === "layer") {
            if (result.layerType === "primary") {
                return result.layerId === dataset.id ? null : "该图层已不存在";
            }

            if (result.layerType === "raster") {
                return rasterLayers.some((layer) => layer.id === result.layerId)
                    ? null
                    : "该地图服务已不存在";
            }

            const layers = result.layerType === "overlay"
                ? overlayLayers
                : analysisResultLayers;
            return layers.some((layer) => layer.id === result.layerId)
                ? null
                : "该图层已不存在";
        }

        if (result.sourceType === "primary") {
            return dataset.collection.features.some(
                (feature) => feature.properties.id === result.featureId,
            ) ? null : "该要素已不存在";
        }

        const sourceLayer = result.sourceType === "overlay"
            ? overlayLayers.find((layer) => layer.id === result.layerId)
            : analysisResultLayers.find((layer) => layer.id === result.layerId);

        return sourceLayer?.collection.features[result.featureIndex]
            ? null
            : "该要素已不存在";
    }

    function executeWorkspaceCommand(commandId: WorkspaceCommandId) {
        if (getWorkspaceCommandDisabledReason(commandId)) {
            return false;
        }

        switch (commandId) {
            case "open-filter":
                return openWorkspacePanelFromSearch("filter");
            case "open-layers":
                return openWorkspacePanelFromSearch("layers");
            case "open-feature-table":
                return openWorkspacePanelFromSearch("table");
            case "open-layer-style":
                return openWorkspacePanelFromSearch("style");
            case "open-aoi-analysis":
                return openWorkspacePanelFromSearch("aoi-analysis");
            case "open-geoprocessing":
                return openWorkspacePanelFromSearch("geoprocessing");
            case "open-data-quality":
                return openWorkspacePanelFromSearch("data-quality");
            case "open-geometry-editor":
                return openWorkspacePanelFromSearch("geometry-edit");
            case "open-report-builder":
                return openWorkspacePanelFromSearch("report-builder");
            case "open-data-sources":
                return openWorkspacePanelFromSearch("data-sources");
            case "open-temporal":
                return openWorkspacePanelFromSearch("temporal");
            case "open-temporal-compare":
                return openWorkspacePanelFromSearch("temporal-compare");
            case "open-spatial-statistics":
                return openWorkspacePanelFromSearch("spatial-statistics");
            case "open-agent":
                return openWorkspacePanelFromSearch("agent");
            case "open-basemap":
                return openWorkspacePanelFromSearch("basemap");
            case "navigate-statistics":
                navigate("/statistics");
                return true;
            case "navigate-report":
                navigate("/report");
                return true;
            case "fit-all":
                requestMapView("fit-all");
                return true;
            case "fit-selection":
                handleFitFeatureSelection();
                return true;
            case "clear-selection":
                handleClearFeatureSelection();
                return true;
        }
    }

    function executeWorkspaceSearchResult(result: WorkspaceSearchResult) {
        if (getWorkspaceSearchDisabledReason(result)) {
            return false;
        }

        if (result.type === "command") {
            return executeWorkspaceCommand(result.commandId);
        }

        if (result.type === "coordinate") {
            setSearchResultFeature(null);
            setSearchLocation([result.longitude, result.latitude]);
            setMapViewCommand((previous) => ({
                type: "jump-to-coordinate",
                requestId: (previous?.requestId ?? 0) + 1,
                longitude: result.longitude,
                latitude: result.latitude,
                zoom: 15,
            }));
            return true;
        }

        if (result.type === "layer") {
            setFocusedLayerId(result.layerId);

            if (!openWorkspacePanelFromSearch("layers")) {
                return false;
            }

            if (result.layerType === "primary") {
                requestMapView("fit-all");
            } else if (result.layerType !== "raster") {
                setMapViewCommand((previous) => ({
                    type: "fit-search-layer",
                    requestId: (previous?.requestId ?? 0) + 1,
                    layerType: result.layerType === "overlay"
                        ? "overlay"
                        : "analysis",
                    layerId: result.layerId,
                }));
            }
            return true;
        }

        if (result.sourceType === "primary") {
            const feature = dataset?.collection.features.find(
                (item) => item.properties.id === result.featureId,
            );

            if (!feature) {
                return false;
            }

            setSearchResultFeature(null);
            setSearchLocation(null);
            handleFeatureSelect(feature, { fitFeature: true });
            return openWorkspacePanelFromSearch("feature");
        }

        const sourceLayer = result.sourceType === "overlay"
            ? overlayLayers.find((layer) => layer.id === result.layerId)
            : analysisResultLayers.find((layer) => layer.id === result.layerId);
        const feature = sourceLayer?.collection.features[result.featureIndex];

        if (!feature) {
            return false;
        }

        setSearchLocation(null);
        setSearchResultFeature(feature);
        setMapViewCommand((previous) => ({
            type: "fit-search-result",
            requestId: (previous?.requestId ?? 0) + 1,
        }));
        return true;
    }

    const executeWorkspaceSearchResultRef = useRef(
        executeWorkspaceSearchResult,
    );
    executeWorkspaceSearchResultRef.current = executeWorkspaceSearchResult;
    const getWorkspaceSearchDisabledReasonRef = useRef(
        getWorkspaceSearchDisabledReason,
    );
    getWorkspaceSearchDisabledReasonRef.current =
        getWorkspaceSearchDisabledReason;

    useEffect(() => {
        const controller: WorkspaceSearchController = {
            index: workspaceSearchIndex,
            execute: (result) =>
                executeWorkspaceSearchResultRef.current(result),
            getDisabledReason: (result) =>
                getWorkspaceSearchDisabledReasonRef.current(result),
        };

        registerWorkspaceSearch(controller);
        return () => registerWorkspaceSearch(null);
    }, [
        registerWorkspaceSearch,
        workspaceSearchIndex,
    ]);

    useEffect(() => {
        if (!focusedLayerId) {
            return;
        }

        const timeoutId = window.setTimeout(
            () => setFocusedLayerId(null),
            2800,
        );
        return () => window.clearTimeout(timeoutId);
    }, [focusedLayerId]);

    const {
        mode: measureMode,
        points: measurePoints,
        isComplete: measureCompleted,
        addPoint: addMeasurePoint,
        start: startMeasure,
        complete: completeMeasure,
        restart: restartMeasure,
        clear: clearMeasure,
        result: measureValue,
    } = useMeasure();

    useEffect(() => {
        if (geometryEditor.mode === "idle") {
            return;
        }

        const handleGeometryShortcut = (event: KeyboardEvent) => {
            const target = event.target;

            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement
            ) {
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                setGeometryAbandonConfirmationOpen(true);
                return;
            }

            if (
                (event.key === "Delete" || event.key === "Backspace") &&
                geometryEditor.activeVertexIndex !== null
            ) {
                event.preventDefault();
                geometryEditor.deleteActiveVertex();
            }
        };

        window.addEventListener("keydown", handleGeometryShortcut);
        return () => {
            window.removeEventListener("keydown", handleGeometryShortcut);
        };
    }, [
        geometryEditor,
    ]);

    persistenceBlockerRef.current = geometryEditor.mode === "idle"
        ? null
        : "请先保存或取消当前几何编辑，再保存工程。";

    projectSnapshotInputRef.current = dataset
        ? {
            data: {
                primaryDataset: dataset,
                overlayLayers,
                rasterLayers,
                analysisResultLayers,
            },
            map: {
                ...projectMapState,
                basemap,
            },
            workspace: {
                filters: {
                    ...state.filters,
                    landUseTypes: [...state.filters.landUseTypes],
                },
                attributeQuery: state.attributeQuery,
                layerStyle: {
                    layerVisible: layerStyle.layerVisible,
                    fillVisible: layerStyle.fillVisible,
                    fillColor: layerStyle.fillColor,
                    fillOpacity: layerStyle.fillOpacity,
                    outlineVisible: layerStyle.outlineVisible,
                    outlineColor: layerStyle.outlineColor,
                    outlineWidth: layerStyle.outlineWidth,
                    outlineOpacity: layerStyle.outlineOpacity,
                    symbologyMode: layerStyle.symbologyMode,
                    categorizedField: layerStyle.categorizedField,
                    graduatedField: layerStyle.graduatedField,
                    classificationMethod: layerStyle.classificationMethod,
                    classCount: layerStyle.classCount,
                    colorRamp: layerStyle.colorRamp,
                },
                selectedFeatureIds,
                selectedFeatureId: selectedFeature?.properties.id ?? null,
                aoiFeature: persistedAoiFeature,
                aoiRelation,
                aoiQueryResult: aoiAnalysisResult,
                bufferFeature,
                bufferResult,
                bufferSpatialQueryResult: spatialQueryResult,
                temporalConfig,
                ...(temporalCompareConfig.beforeTime < temporalCompareConfig.afterTime
                    ? {
                        temporalCompare: {
                            layout: temporalCompareConfig.layout,
                            beforeTime: temporalCompareConfig.beforeTime,
                            afterTime: temporalCompareConfig.afterTime,
                            syncCamera: temporalCompareConfig.syncCamera,
                        },
                    }
                    : {}),
            },
        }
        : null;

    useEffect(() => {
        registerWorkspaceController({
            createSnapshotInput: (metadata) => {
                const current = projectSnapshotInputRef.current;

                return current
                    ? {
                        project: metadata,
                        ...current,
                    }
                    : null;
            },
            getPersistenceBlocker: () => persistenceBlockerRef.current,
        });

        return () => registerWorkspaceController(null);
    }, [registerWorkspaceController]);

    useEffect(() => {
        notifyPersistenceStateChange();
    }, [geometryEditor.mode, notifyPersistenceStateChange]);

    useEffect(() => {
        if (!pendingProject) {
            return;
        }

        const project = pendingProject;
        const primaryFeatures = project.data.primaryDataset.collection.features;
        const featuresById = new Map(
            primaryFeatures.map((feature) => [feature.properties.id, feature]),
        );
        const restoredSelectionIds = project.workspace.selectedFeatureIds.filter(
            (featureId) => featuresById.has(featureId),
        );
        const restoredSelectedFeature = project.workspace.selectedFeatureId
            ? featuresById.get(project.workspace.selectedFeatureId) ?? null
            : null;
        const resolveResultFeatures = (result: SpatialQueryResult | null) =>
            result?.featureIds.flatMap((featureId) => {
                const feature = featuresById.get(featureId);
                return feature ? [feature] : [];
            }) ?? [];
        const restoredLayerStyle: LayerStyle = {
            ...project.workspace.layerStyle,
            graduatedClasses: [],
        };

        skipNextFilterQueryInvalidationRef.current = true;
        skipNextPersistentDirtyRef.current = true;
        setBasemap(project.map.basemap);
        setProjectMapState(project.map);
        setRestoreViewState((previous) => ({
            requestId: (previous?.requestId ?? 0) + 1,
            state: project.map,
        }));
        setLayerStyle(restoredLayerStyle);
        setSavedLayerStyle(restoredLayerStyle);
        setOverlayLayers(project.data.overlayLayers);
        setRasterLayers(project.data.rasterLayers);
        setAnalysisResultLayers(project.data.analysisResultLayers);
        setSelectedFeatureIds(restoredSelectionIds);
        setSelectedFeature(restoredSelectedFeature);
        setShouldFitSelected(false);
        restoreAoi(project.workspace.aoiFeature);
        setPersistedAoiFeature(project.workspace.aoiFeature);
        setAoiRelation(project.workspace.aoiRelation);
        setAoiAnalysisResult(project.workspace.aoiQueryResult);
        setAoiQueryFeatures(resolveResultFeatures(project.workspace.aoiQueryResult));
        setAoiQueryError(null);
        setBufferFeature(project.workspace.bufferFeature);
        setBufferResult(project.workspace.bufferResult);
        setBufferError(null);
        setSpatialQueryResult(project.workspace.bufferSpatialQueryResult);
        setSpatialQueryFeatures(resolveResultFeatures(
            project.workspace.bufferSpatialQueryResult,
        ));
        setSpatialQueryError(null);
        setTemporalConfig({
            ...(project.workspace.temporalConfig ?? DEFAULT_TEMPORAL_CONFIG),
        });
        setTemporalCompareConfig({
            ...DEFAULT_TEMPORAL_MAP_COMPARE_CONFIG,
            ...project.workspace.temporalCompare,
            enabled: false,
        });
        setTemporalCompareSnapshot(null);
        setTemporalCompareError(null);
        setTemporalCompareCapturing(false);
        setTemporalCompareCaptureRequestId(null);
        setActivePanel(null);
        setActiveTool("select");
        setMapViewCommand(null);
        setGeoprocessingSummary(null);
        setGeoprocessingError(null);
        setOverlayImportError(null);
        setEditMessage(null);
        setLastAgentSnapshot(null);
        setAgentExecutionEvents([]);
        setDataQualityReport(null);
        setSelectedQualityIssueId(null);
        setQualityError(null);
        setCleanedDataset(null);
        setCleanedQualityReport(null);
        setQualityScanning(false);
        setPendingFeatureId(null);
        setGeometryValidationError(null);
        setGeometryDeleteConfirmationOpen(false);
        setGeometryAbandonConfirmationOpen(false);
        clearMeasure();
        geometryEditor.reset();
        editHistory.clear();
        completeProjectRestore(project.project.id);
    }, [
        clearMeasure,
        completeProjectRestore,
        editHistory,
        geometryEditor,
        pendingProject,
        restoreAoi,
    ]);

    useEffect(() => {
        const currentReferences: readonly unknown[] = [
            state.dataset,
            state.filters,
            state.attributeQuery,
            layerStyle,
            selectedFeatureIds,
            selectedFeature?.properties.id ?? null,
            persistedAoiFeature,
            aoiRelation,
            aoiAnalysisResult,
            bufferFeature,
            bufferResult,
            spatialQueryResult,
            overlayLayers,
            rasterLayers,
            analysisResultLayers,
            basemap,
            temporalConfig,
            temporalCompareConfig.layout,
            temporalCompareConfig.beforeTime,
            temporalCompareConfig.afterTime,
            temporalCompareConfig.syncCamera,
        ];
        const previousReferences = persistentReferencesRef.current;
        const changed = previousReferences !== null &&
            currentReferences.some(
                (reference, index) => reference !== previousReferences[index],
            );

        persistentReferencesRef.current = currentReferences;

        if (
            !changed ||
            pendingProject ||
            !projectMeta
        ) {
            return;
        }

        if (skipNextPersistentDirtyRef.current) {
            skipNextPersistentDirtyRef.current = false;
            return;
        }

        markProjectDirty();
    }, [
        analysisResultLayers,
        aoiAnalysisResult,
        aoiRelation,
        basemap,
        bufferFeature,
        bufferResult,
        layerStyle,
        markProjectDirty,
        overlayLayers,
        rasterLayers,
        pendingProject,
        persistedAoiFeature,
        projectMeta,
        selectedFeature,
        selectedFeatureIds,
        spatialQueryResult,
        state.attributeQuery,
        state.dataset,
        state.filters,
        temporalConfig,
        temporalCompareConfig.afterTime,
        temporalCompareConfig.beforeTime,
        temporalCompareConfig.layout,
        temporalCompareConfig.syncCamera,
    ]);

    if (!dataset ||
        state.importStatus !== "loaded") {
        return (
            <section className="workspace-page workspace-empty-search-map">
                <main className="workspace-map-area">
                    <header className="workspace-map-header">
                        <div>
                            <h1>地图工作台</h1>
                            <p>尚未加载主数据，仍可通过全局搜索定位坐标。</p>
                        </div>
                        <Link to="/import">前往数据导入</Link>
                    </header>
                    <div className="workspace-map-wrapper">
                        <MapView
                            collection={EMPTY_LAND_USE_COLLECTION}
                            allCollection={EMPTY_LAND_USE_COLLECTION}
                            interactionMode={activeTool}
                            layerStyle={thematicLayerStyle}
                            basemap={basemap}
                            restoreViewState={restoreViewState}
                            onViewStateChange={handleProjectMapStateChange}
                            viewCommand={mapViewCommand}
                            searchResultFeature={searchResultFeature}
                            searchLocation={searchLocation}
                            captureRequestId={mapCaptureRequestId}
                            onMapCapture={handleMapCapture}
                        />
                    </div>
                </main>
            </section>
        );
    }

    const totalFeatureCount =
        dataset.collection.features.length;
    const loadedDataset = dataset;

    const qualityTargets: DataQualityTargetOption[] = [
        {
            id: "primary",
            name: loadedDataset.name,
            featureCount: loadedDataset.collection.features.length,
        },
        ...overlayLayers.map((layer) => ({
            id: layer.id,
            name: layer.name,
            featureCount: layer.featureCount,
        })),
    ];

    function resetQualityResults() {
        qualityScanSequenceRef.current += 1;
        setDataQualityReport(null);
        setSelectedQualityIssueId(null);
        setQualityError(null);
        setCleanedDataset(null);
        setCleanedQualityReport(null);
        setQualityScanning(false);
    }

    function handleQualityTargetChange(targetId: string) {
        setQualityTargetId(targetId);
        resetQualityResults();
    }

    function getQualityTarget() {
        if (qualityTargetId === "primary") {
            return {
                id: "primary",
                name: loadedDataset.name,
                kind: "primary" as const,
                collection: loadedDataset.collection,
            };
        }

        const layer = overlayLayers.find(
            (item) => item.id === qualityTargetId,
        );

        return layer
            ? {
                id: layer.id,
                name: layer.name,
                kind: "overlay" as const,
                collection: layer.collection,
            }
            : null;
    }

    function handleRunQualityScan() {
        const target = getQualityTarget();

        if (!target) {
            setQualityError("检查图层已不存在，请重新选择。");
            return;
        }

        setQualityScanning(true);
        setQualityError(null);
        setSelectedQualityIssueId(null);
        setCleanedDataset(null);
        setCleanedQualityReport(null);

        const scanSequence = qualityScanSequenceRef.current + 1;
        qualityScanSequenceRef.current = scanSequence;

        window.requestAnimationFrame(() => {
            if (qualityScanSequenceRef.current !== scanSequence) {
                return;
            }

            try {
                setDataQualityReport(scanFeatureCollection(
                    target.collection,
                    {
                        targetId: target.id,
                        targetName: target.name,
                        targetKind: target.kind,
                    },
                ));
            } catch (error) {
                setDataQualityReport(null);
                setQualityError(
                    error instanceof Error
                        ? error.message
                        : "无法完成数据质量检查，请检查数据格式。",
                );
            } finally {
                if (qualityScanSequenceRef.current === scanSequence) {
                    setQualityScanning(false);
                }
            }
        });
    }

    function handleSelectQualityIssue(issue: DataQualityIssue) {
        setSelectedQualityIssueId(issue.id);

        if (!issue.locatable) {
            return;
        }

        setMapViewCommand((previous) => ({
            type: "fit-quality-issue",
            issueId: issue.id,
            requestId: (previous?.requestId ?? 0) + 1,
        }));
    }

    function handleCreateCleanedDataset() {
        if (!qualitySourceCollection || !dataQualityReport) {
            return;
        }

        setCleanedDataset(createCleanedDataset(
            qualitySourceCollection,
            dataQualityReport,
        ));
        setCleanedQualityReport(null);
    }

    function handleAddCleanedLayer() {
        if (!cleanedDataset) {
            return;
        }

        try {
            const parsedLayer = parseOverlayGeoJson(
                cleanedDataset.collection,
                `${cleanedDataset.targetName}.geojson`,
            );

            setOverlayLayers((previous) => {
                const name = getUniqueOverlayLayerName(
                    cleanedDataset.targetName,
                    previous,
                );

                return [
                    ...previous,
                    {
                        ...parsedLayer,
                        name,
                        style: createDefaultOverlayLayerStyle(
                            previous.length,
                            parsedLayer.geometryKind,
                        ),
                    },
                ];
            });
            setQualityError(null);
        } catch (error) {
            setQualityError(
                error instanceof Error
                    ? error.message
                    : "清洗副本无法添加为图层。",
            );
        }
    }

    function handleExportCleanedDataset() {
        if (!cleanedDataset) {
            return;
        }

        exportFeatureCollection(
            cleanedDataset.collection,
            `geoinsight-cleaned-${cleanedDataset.targetName}-${Date.now()}.geojson`,
        );
    }

    function handleExportQualityReport() {
        if (!dataQualityReport) {
            return;
        }

        exportDataQualityReport(
            dataQualityReport,
            `geoinsight-data-quality-report-${Date.now()}.csv`,
        );
    }

    function handleRescanCleanedDataset() {
        if (!cleanedDataset) {
            return;
        }

        try {
            setCleanedQualityReport(scanFeatureCollection(
                cleanedDataset.collection,
                {
                    targetId: `${cleanedDataset.targetId}-cleaned`,
                    targetName: cleanedDataset.targetName,
                    targetKind: cleanedDataset.targetKind,
                },
            ));
            setQualityError(null);
        } catch {
            setQualityError("无法重新检查清洗结果。");
        }
    }

    function invalidatePrimaryQualityReport() {
        if (qualityTargetId !== "primary" || !dataQualityReport) {
            return;
        }

        setDataQualityReport(null);
        setSelectedQualityIssueId(null);
        setCleanedDataset(null);
        setCleanedQualityReport(null);
        setQualityError("数据已发生变化，请重新运行质量检查。");
    }

    function invalidatePrimaryGeometryDependents() {
        handleClearBuffer();
        handleClearAoiQuery();
        invalidatePrimaryQualityReport();
    }

    function prepareGeometryCommit() {
        const geometry = createClosedPolygonGeometry(
            geometryEditor.draftCoordinates,
        );

        if (!geometry) {
            setGeometryValidationError("Polygon 至少需要 3 个不同顶点。");
            return null;
        }

        const validation = validateEditablePolygonGeometry(geometry);

        if (!validation.valid) {
            setGeometryValidationError(
                validation.message ?? "当前 Polygon 无法保存。",
            );
            return null;
        }

        const areaM2 = calculateEditedGeometryAreaM2(geometry);

        if (areaM2 === null) {
            setGeometryValidationError("无法计算有效面积，请检查 Polygon 顶点。");
            return null;
        }

        setGeometryValidationError(null);
        return { geometry, areaM2 };
    }

    function handleStartGeometryCreate() {
        clearMeasure();

        if (aoiMode === "drawing") {
            handleClearAoiAnalysis();
        }

        setPendingFeatureId(crypto.randomUUID());
        setGeometryValidationError(null);
        setGeometryDeleteConfirmationOpen(false);
        setGeometryAbandonConfirmationOpen(false);
        geometryEditor.startCreate();
        setActivePanel("geometry-edit");
    }

    function handleStartGeometryEdit(feature: LandUseFeature) {
        if (feature.geometry.coordinates.length !== 1) {
            setSelectedFeature(feature);
            setSelectedFeatureIds([feature.properties.id]);
            setGeometryValidationError(
                "当前版本暂不支持含内环的 Polygon 几何编辑。",
            );
            setActivePanel("geometry-edit");
            return;
        }

        clearMeasure();

        if (aoiMode === "drawing") {
            handleClearAoiAnalysis();
        }

        setSelectedFeature(feature);
        setSelectedFeatureIds([feature.properties.id]);
        setPendingFeatureId(null);
        setGeometryValidationError(null);
        setGeometryDeleteConfirmationOpen(false);
        setGeometryAbandonConfirmationOpen(false);
        geometryEditor.startEdit(feature);
        setActivePanel("geometry-edit");
    }

    function handleCompleteGeometryDrawing() {
        if (!geometryEditor.completeDrawing()) {
            setGeometryValidationError("至少添加 3 个不同顶点后才能完成 Polygon。");
            return;
        }

        setGeometryValidationError(null);
    }

    function handleCreateGeometryFeature(
        properties: NewLandUseProperties,
    ) {
        const currentDataset = state.dataset;
        const prepared = prepareGeometryCommit();

        if (!currentDataset || !prepared || !pendingFeatureId) {
            return;
        }

        const feature: LandUseFeature = {
            type: "Feature",
            geometry: prepared.geometry,
            properties: {
                id: pendingFeatureId,
                ...properties,
                areaM2: prepared.areaM2,
            },
        };
        const transaction: EditTransaction = {
            id: crypto.randomUUID(),
            type: "feature_create",
            label: "新建地块",
            timestamp: Date.now(),
            featureCount: 1,
            createdFeature: feature,
            featureIndex: currentDataset.collection.features.length,
        };

        dispatch({
            type: "ADD_FEATURE",
            payload: { feature },
        });
        editHistory.pushTransaction(transaction);
        invalidatePrimaryGeometryDependents();
        setSelectedFeature(feature);
        setSelectedFeatureIds([feature.properties.id]);
        setEditMessage(`已创建地块 ${feature.properties.id}。`);
        setPendingFeatureId(null);
        geometryEditor.reset();
        setActivePanel("feature");
    }

    function handleSaveGeometryEdit() {
        const currentDataset = state.dataset;
        const featureId = geometryEditor.editingFeatureId;
        const sourceFeature = currentDataset?.collection.features.find(
            (feature) => feature.properties.id === featureId,
        );
        const prepared = prepareGeometryCommit();

        if (!featureId || !sourceFeature || !prepared) {
            if (!sourceFeature) {
                setGeometryValidationError("找不到正在编辑的地块，无法保存。 ");
            }
            return;
        }

        const transaction: EditTransaction = {
            id: crypto.randomUUID(),
            type: "geometry_update",
            label: "修改地块几何",
            timestamp: Date.now(),
            featureCount: 1,
            featureId,
            beforeGeometry: sourceFeature.geometry,
            afterGeometry: prepared.geometry,
            beforeAreaM2: sourceFeature.properties.areaM2,
            afterAreaM2: prepared.areaM2,
        };
        const updatedFeature: LandUseFeature = {
            ...sourceFeature,
            geometry: prepared.geometry,
            properties: {
                ...sourceFeature.properties,
                areaM2: prepared.areaM2,
            },
        };

        dispatch({
            type: "UPDATE_FEATURE_GEOMETRY",
            payload: {
                featureId,
                geometry: prepared.geometry,
                areaM2: prepared.areaM2,
            },
        });
        editHistory.pushTransaction(transaction);
        invalidatePrimaryGeometryDependents();
        setSelectedFeature(updatedFeature);
        setSelectedFeatureIds([featureId]);
        setEditMessage(`已更新地块 ${featureId} 的几何与面积。`);
        geometryEditor.reset();
        setActivePanel("feature");
    }

    function handleCancelGeometryDraft() {
        geometryEditor.cancel();
        setPendingFeatureId(null);
        setGeometryValidationError(null);
        setGeometryDeleteConfirmationOpen(false);
        setGeometryAbandonConfirmationOpen(false);
    }

    function handleRequestGeometryDelete(feature?: LandUseFeature) {
        if (feature) {
            setSelectedFeature(feature);
            setSelectedFeatureIds([feature.properties.id]);
        }

        setGeometryDeleteConfirmationOpen(true);
        setActivePanel("geometry-edit");
    }

    function handleConfirmGeometryDelete() {
        const currentDataset = state.dataset;

        if (!selectedFeature || !currentDataset) {
            setGeometryDeleteConfirmationOpen(false);
            return;
        }

        const featureId = selectedFeature.properties.id;
        const featureIndex = currentDataset.collection.features.findIndex(
            (feature) => feature.properties.id === featureId,
        );

        if (featureIndex < 0) {
            setGeometryValidationError("找不到需要删除的地块。 ");
            return;
        }

        const transaction: EditTransaction = {
            id: crypto.randomUUID(),
            type: "feature_delete",
            label: "删除地块",
            timestamp: Date.now(),
            featureCount: 1,
            deletedFeature: selectedFeature,
            featureIndex,
        };

        dispatch({
            type: "DELETE_FEATURE",
            payload: { featureId },
        });
        editHistory.pushTransaction(transaction);
        invalidatePrimaryGeometryDependents();
        setSelectedFeature(null);
        setSelectedFeatureIds((previous) => previous.filter(
            (id) => id !== featureId,
        ));
        setEditMessage(`已删除地块 ${featureId}，可通过撤销恢复。`);
        setGeometryDeleteConfirmationOpen(false);
        geometryEditor.reset();
    }

    function handleToggleFeatureSelection(featureId: string) {
        setSelectedFeatureIds((previous) => previous.includes(featureId)
            ? previous.filter((id) => id !== featureId)
            : [...previous, featureId],
        );
    }

    function handleSelectAllFilteredFeatures() {
        setSelectedFeatureIds(
            filteredFeatures.map((feature) => feature.properties.id),
        );
    }

    function handleInvertFilteredSelection() {
        const visibleIds = new Set(
            filteredFeatures.map((feature) => feature.properties.id),
        );

        setSelectedFeatureIds((previous) => {
            const previousSet = new Set(previous);
            const hiddenIds = previous.filter((id) => !visibleIds.has(id));
            const invertedVisibleIds = filteredFeatures
                .map((feature) => feature.properties.id)
                .filter((id) => !previousSet.has(id));

            return [...hiddenIds, ...invertedVisibleIds];
        });
    }

    function handleClearFeatureSelection() {
        setSelectedFeatureIds([]);
    }

    function handleFitFeatureSelection() {
        if (selectedFeatureIds.length > 0) {
            requestMapView("fit-selection");
        }
    }

    function handleExportSelectionGeoJson() {
        if (selectedFeatures.length === 0) {
            return;
        }

        exportFeatureCollection(
            {
                type: "FeatureCollection",
                features: selectedFeatures,
            },
            `geoinsight-selection-${Date.now()}.geojson`,
        );
    }

    function handleExportSelectionCsv() {
        if (selectedFeatures.length === 0) {
            return;
        }

        downloadLandUseCsv(
            selectedFeatures,
            `geoinsight-selection-${Date.now()}.csv`,
        );
    }

    function createEditTransaction(
        changes: LandUsePropertyChanges,
    ): EditTransaction | null {
        const patches = selectedFeatures.flatMap((feature) => {
            const before: LandUsePropertyChanges = {};
            const after: LandUsePropertyChanges = {};

            if (
                changes.landUseType !== undefined &&
                changes.landUseType !== feature.properties.landUseType
            ) {
                before.landUseType = feature.properties.landUseType;
                after.landUseType = changes.landUseType;
            }

            if (
                changes.builtYear !== undefined &&
                changes.builtYear !== feature.properties.builtYear
            ) {
                before.builtYear = feature.properties.builtYear;
                after.builtYear = changes.builtYear;
            }

            if (
                changes.districtCode !== undefined &&
                changes.districtCode !== feature.properties.districtCode
            ) {
                before.districtCode = feature.properties.districtCode;
                after.districtCode = changes.districtCode;
            }

            return Object.keys(after).length > 0
                ? [{
                    featureId: feature.properties.id,
                    before,
                    after,
                }]
                : [];
        });

        if (patches.length === 0) {
            return null;
        }

        const editedFields = [
            changes.landUseType !== undefined ? "用地类型" : null,
            changes.builtYear !== undefined ? "建成年份" : null,
            changes.districtCode !== undefined ? "行政区代码" : null,
        ].filter((field): field is string => field !== null);

        return {
            id: crypto.randomUUID(),
            type: "batch_attribute_edit",
            label: `批量修改${editedFields.join("、")}`,
            timestamp: Date.now(),
            featureCount: patches.length,
            patches,
        };
    }

    function applyEditTransaction(
        transaction: EditTransaction,
        direction: "before" | "after",
    ) {
        if (transaction.type === "batch_attribute_edit") {
            dispatch({
                type: "UPDATE_FEATURE_PROPERTIES_BATCH",
                payload: {
                    updates: transaction.patches.map((patch) => ({
                        featureId: patch.featureId,
                        changes: patch[direction],
                    })),
                },
            });
            invalidatePrimaryQualityReport();
            setSelectedFeatureIds([]);
            return;
        }

        invalidatePrimaryGeometryDependents();

        if (transaction.type === "geometry_update") {
            const useBefore = direction === "before";

            dispatch({
                type: "UPDATE_FEATURE_GEOMETRY",
                payload: {
                    featureId: transaction.featureId,
                    geometry: useBefore
                        ? transaction.beforeGeometry
                        : transaction.afterGeometry,
                    areaM2: useBefore
                        ? transaction.beforeAreaM2
                        : transaction.afterAreaM2,
                },
            });
            setSelectedFeatureIds([transaction.featureId]);
            return;
        }

        const shouldAdd = (
            transaction.type === "feature_create" && direction === "after"
        ) || (
            transaction.type === "feature_delete" && direction === "before"
        );
        const feature = transaction.type === "feature_create"
            ? transaction.createdFeature
            : transaction.deletedFeature;

        if (shouldAdd) {
            dispatch({
                type: "ADD_FEATURE",
                payload: {
                    feature,
                    index: transaction.featureIndex,
                },
            });
            setSelectedFeature(feature);
            setSelectedFeatureIds([feature.properties.id]);
        } else {
            dispatch({
                type: "DELETE_FEATURE",
                payload: {
                    featureId: feature.properties.id,
                },
            });
            setSelectedFeature(null);
            setSelectedFeatureIds((previous) => previous.filter(
                (id) => id !== feature.properties.id,
            ));
        }
    }

    function handleApplyBatchEdit(changes: LandUsePropertyChanges) {
        const transaction = createEditTransaction(changes);

        if (!transaction) {
            setEditMessage("所选要素已经具有目标属性值。");
            setActivePanel("table");
            return;
        }

        applyEditTransaction(transaction, "after");
        editHistory.pushTransaction(transaction);
        setEditMessage(`已修改 ${transaction.featureCount} 个地块。`);
        setActivePanel("table");
    }

    function handleUndoEdit() {
        const transaction = editHistory.undo();

        if (!transaction) {
            return;
        }

        applyEditTransaction(transaction, "before");
        setEditMessage(`已撤销：${transaction.label}。`);
    }

    function handleRedoEdit() {
        const transaction = editHistory.redo();

        if (!transaction) {
            return;
        }

        applyEditTransaction(transaction, "after");
        setEditMessage(`已重做：${transaction.label}。`);
    }

    const agentContext: AgentContext = {
        datasetName: dataset.name,
        featureCount: totalFeatureCount,
        filteredFeatureCount: filteredFeatures.length,
        currentFilters: {
            landUseTypes: [
                ...state.filters.landUseTypes,
            ],
            minimumBuiltYear: state.filters.minimumBuiltYear,
            districtCode: state.filters.districtCode,
        },
        currentLayerStyle: {
            layerVisible: layerStyle.layerVisible,
            fillVisible: layerStyle.fillVisible,
            fillColor: layerStyle.fillColor,
            fillOpacity: layerStyle.fillOpacity,
            outlineVisible: layerStyle.outlineVisible,
            outlineColor: layerStyle.outlineColor,
            outlineWidth: layerStyle.outlineWidth,
            outlineOpacity: layerStyle.outlineOpacity,
            symbologyMode: layerStyle.symbologyMode,
        },
        selectedFeature: selectedFeature
            ? {
                id: selectedFeature.properties.id,
                landUseType:
                    selectedFeature.properties.landUseType,
            }
            : null,
        hasBuffer: bufferFeature !== null,
        bufferDistanceM: bufferResult?.distance ?? null,
        hasAoi: aoiPolygon !== null,
        aoiCompleted:
            aoiMode === "completed" && aoiPolygon !== null,
        bufferQueryFeatureCount: spatialQueryFeatures.length,
        aoiQueryFeatureCount: aoiQueryFeatures.length,
        analysisLayers: analysisResultLayers.flatMap(
            (layer) => layer.operation === "spatial-hexbin"
                ? []
                : [{
                id: layer.id,
                name: layer.name,
                operation: layer.operation,
                featureCount: layer.featureCount,
                visible: layer.visible,
                }],
        ),
        overlayLayers: overlayLayers.map(
            (layer) => ({
                id: layer.id,
                name: layer.name,
                geometryKind: layer.geometryKind,
                featureCount: layer.featureCount,
                visible: layer.style.visible,
            }),
        ),
        symbology: {
            mode: layerStyle.symbologyMode,
            field:
                layerStyle.symbologyMode === "graduated"
                    ? layerStyle.graduatedField
                    : null,
            method:
                layerStyle.symbologyMode === "graduated"
                    ? layerStyle.classificationMethod
                    : null,
            classCount:
                layerStyle.symbologyMode === "graduated"
                    ? layerStyle.classCount
                    : null,
            colorRamp:
                layerStyle.symbologyMode === "graduated"
                    ? layerStyle.colorRamp
                    : null,
        },
    };

    function createAgentSnapshot(): AgentSnapshot {
        return {
            filters: {
                ...state.filters,
                landUseTypes: [
                    ...state.filters.landUseTypes,
                ],
            },
            layerStyle: {
                ...layerStyle,
                graduatedClasses:
                    layerStyle.graduatedClasses.map(
                        (item) => ({ ...item }),
                    ),
            },
            bufferFeature,
            bufferResult: bufferResult
                ? { ...bufferResult }
                : null,
            bufferError,
            spatialQueryFeatures: [
                ...spatialQueryFeatures,
            ],
            spatialQueryResult: spatialQueryResult
                ? {
                    ...spatialQueryResult,
                    featureIds: [
                        ...spatialQueryResult.featureIds,
                    ],
                    typeCounts: {
                        ...spatialQueryResult.typeCounts,
                    },
                }
                : null,
            spatialQueryError,
            aoiRelation,
            aoiQueryFeatures: [...aoiQueryFeatures],
            aoiAnalysisResult: aoiAnalysisResult
                ? {
                    ...aoiAnalysisResult,
                    featureIds: [
                        ...aoiAnalysisResult.featureIds,
                    ],
                    typeCounts: {
                        ...aoiAnalysisResult.typeCounts,
                    },
                }
                : null,
            aoiQueryError,
            analysisResultLayers:
                analysisResultLayers.map(
                    (layer) => ({ ...layer }),
                ),
            geoprocessingSummary:
                geoprocessingSummary
                    ? { ...geoprocessingSummary }
                    : null,
            geoprocessingError,
        };
    }

    function createAgentExecutionContext(): AgentExecutionContext {
        return {
            filters: {
                ...state.filters,
                landUseTypes: [
                    ...state.filters.landUseTypes,
                ],
            },
            filteredCollection: {
                type: "FeatureCollection",
                features: [...filteredFeatures],
            },
            layerStyle: {
                ...layerStyle,
                graduatedClasses: [
                    ...layerStyle.graduatedClasses,
                ],
            },
            bufferFeature,
            bufferResult,
            spatialQueryFeatures: [
                ...spatialQueryFeatures,
            ],
            spatialQueryResult,
            aoiQueryFeatures: [...aoiQueryFeatures],
            aoiAnalysisResult,
            analysisResultLayers:
                analysisResultLayers.map(
                    (layer) => ({ ...layer }),
                ),
        };
    }

    function clearAgentDependentQueries(
        executionContext: AgentExecutionContext,
    ) {
        executionContext.spatialQueryFeatures = [];
        executionContext.spatialQueryResult = null;
        executionContext.aoiQueryFeatures = [];
        executionContext.aoiAnalysisResult = null;
        handleClearSpatialQuery();
        handleClearAoiQuery();
    }

    function updateAgentFilteredCollection(
        executionContext: AgentExecutionContext,
    ) {
        executionContext.filteredCollection = {
            type: "FeatureCollection",
            features: applyLandUseFilters(
                dataset?.collection.features ?? [],
                executionContext.filters,
            ),
        };
    }

    function resolveAgentGeoprocessingInput(
        command: Extract<
            AgentCommand,
            { type: "run_geoprocessing" }
        >,
        executionContext: AgentExecutionContext,
    ): LandUseFeatureCollection {
        const features =
            command.payload.inputSource === "aoi-query"
                ? executionContext.aoiQueryFeatures
                : command.payload.inputSource === "buffer-query"
                    ? executionContext.spatialQueryFeatures
                    : executionContext.filteredCollection.features;

        return {
            type: "FeatureCollection",
            features: [...features],
        };
    }

    function createAgentGeoprocessingRequest(
        command: Extract<
            AgentCommand,
            { type: "run_geoprocessing" }
        >,
    ): GeoprocessingRunRequest {
        const inputSource = command.payload.inputSource === "filtered"
            ? "current-filtered"
            : command.payload.inputSource;

        if (command.payload.operation === "intersection") {
            return {
                operation: "intersection",
                inputSource,
                overlaySource: command.payload.overlaySource,
                dissolveField: "all",
            };
        }

        if (command.payload.operation === "dissolve") {
            return {
                operation: "dissolve",
                inputSource,
                overlaySource: "aoi",
                dissolveField: command.payload.dissolveField,
            };
        }

        return {
            operation: "centroid",
            inputSource,
            overlaySource: "aoi",
            dissolveField: "all",
        };
    }

    function executeAgentCommand(
        command: AgentCommand,
        executionContext: AgentExecutionContext,
    ): AgentCommandExecutionResult {
        try {
            switch (command.type) {
                case "apply_filter": {
                    const previousCount =
                        executionContext.filteredCollection.features.length;
                    executionContext.filters = {
                        ...executionContext.filters,
                        ...command.payload,
                        landUseTypes: command.payload.landUseTypes
                            ? [...command.payload.landUseTypes]
                            : [
                                ...executionContext.filters.landUseTypes,
                            ],
                    };
                    updateAgentFilteredCollection(executionContext);
                    clearAgentDependentQueries(executionContext);
                    agentHandledFilterClearRef.current = true;
                    dispatch({
                        type: "REPLACE_FILTERS",
                        payload: executionContext.filters,
                    });

                    return {
                        success: true,
                        message: `已应用筛选：${previousCount} → ${executionContext.filteredCollection.features.length} 个要素。`,
                    };
                }

                case "clear_filters": {
                    const previousCount =
                        executionContext.filteredCollection.features.length;
                    executionContext.filters = {
                        landUseTypes: [],
                        minimumBuiltYear: null,
                        districtCode: "",
                    };
                    updateAgentFilteredCollection(executionContext);
                    clearAgentDependentQueries(executionContext);
                    agentHandledFilterClearRef.current = true;
                    dispatch({ type: "CLEAR_FILTERS" });

                    return {
                        success: true,
                        message: `已清除筛选：${previousCount} → ${executionContext.filteredCollection.features.length} 个要素。`,
                    };
                }

                case "update_layer_style": {
                    const { colorMode, ...styleUpdates } =
                        command.payload;
                    const nextStyle: LayerStyle = {
                        ...executionContext.layerStyle,
                        ...styleUpdates,
                        symbologyMode:
                            colorMode === undefined
                                ? executionContext.layerStyle.symbologyMode
                                : colorMode === "classified"
                                    ? "categorized"
                                    : "single",
                    };

                    executionContext.layerStyle = nextStyle;
                    setLayerStyle(nextStyle);

                    return {
                        success: true,
                        message: "已更新土地利用图层基础样式。",
                    };
                }

                case "fit_map_bounds":
                    requestMapView("fit-current");
                    return {
                        success: true,
                        message: "地图已定位到当前筛选结果。",
                    };

                case "navigate_statistics":
                    navigate("/statistics");
                    return {
                        success: true,
                        message: "已打开统计分析页面。",
                    };

                case "create_buffer": {
                    if (!selectedFeature) {
                        return {
                            success: false,
                            message: "请先在地图中选择一个地块。",
                        };
                    }

                    const selectedStillVisible =
                        executionContext.filteredCollection.features.some(
                            (feature) =>
                                feature.properties.id ===
                                selectedFeature.properties.id,
                        );

                    if (!selectedStillVisible) {
                        return {
                            success: false,
                            message: "当前筛选已排除所选地块，请重新选择地块。",
                        };
                    }

                    if (
                        !Number.isFinite(command.distanceM) ||
                        command.distanceM <= 0 ||
                        command.distanceM > 50_000
                    ) {
                        return {
                            success: false,
                            message: "缓冲距离必须大于 0 且不超过 50,000 米。",
                        };
                    }

                    const execution = createBufferExecution(
                        selectedFeature,
                        command.distanceM,
                    );

                    executionContext.bufferFeature = execution.feature;
                    executionContext.bufferResult = execution.result;
                    executionContext.spatialQueryFeatures = [];
                    executionContext.spatialQueryResult = null;
                    setBufferFeature(execution.feature);
                    setBufferResult(execution.result);
                    setBufferError(null);
                    handleClearSpatialQuery();

                    return {
                        success: true,
                        message: `已生成 ${command.distanceM.toLocaleString("zh-CN")} 米缓冲区，面积 ${execution.result.areaKm2.toFixed(3)} km²。`,
                    };
                }

                case "query_buffer": {
                    if (!executionContext.bufferFeature) {
                        return {
                            success: false,
                            message: "请先创建缓冲区。",
                        };
                    }

                    const execution = createSpatialQueryExecution(
                        executionContext.filteredCollection,
                        executionContext.bufferFeature,
                        command.relation,
                    );

                    executionContext.spatialQueryFeatures =
                        execution.features;
                    executionContext.spatialQueryResult =
                        execution.result;
                    setSpatialQueryFeatures(execution.features);
                    setSpatialQueryResult(execution.result);
                    setSpatialQueryError(null);

                    return {
                        success: true,
                        message: `Buffer 空间查询完成，共命中 ${execution.result.featureCount} 个地块。`,
                    };
                }

                case "query_aoi": {
                    if (
                        aoiMode !== "completed" ||
                        !aoiPolygon
                    ) {
                        return {
                            success: false,
                            message: "请先在地图中完成 AOI 绘制。",
                        };
                    }

                    const execution = createSpatialQueryExecution(
                        executionContext.filteredCollection,
                        aoiPolygon,
                        command.relation,
                    );

                    executionContext.aoiQueryFeatures =
                        execution.features;
                    executionContext.aoiAnalysisResult =
                        execution.result;
                    setAoiRelation(command.relation);
                    setAoiQueryFeatures(execution.features);
                    setAoiAnalysisResult(execution.result);
                    setAoiQueryError(null);

                    return {
                        success: true,
                        message: `AOI 空间查询完成，共命中 ${execution.result.featureCount} 个地块。`,
                    };
                }

                case "run_geoprocessing": {
                    const request = createAgentGeoprocessingRequest(
                        command,
                    );
                    const inputCollection =
                        resolveAgentGeoprocessingInput(
                            command,
                            executionContext,
                        );
                    const execution = createGeoprocessingExecution(
                        request,
                        inputCollection,
                        {
                            aoi: aoiPolygon,
                            buffer: executionContext.bufferFeature,
                        },
                    );

                    executionContext.analysisResultLayers = [
                        ...executionContext.analysisResultLayers,
                        execution.layer,
                    ];
                    setAnalysisResultLayers(
                        executionContext.analysisResultLayers,
                    );
                    setGeoprocessingSummary(execution.summary);
                    setGeoprocessingError(null);

                    return {
                        success: true,
                        message: `${execution.layer.name} 已生成 ${execution.layer.featureCount} 个要素。`,
                    };
                }

                case "update_symbology": {
                    const nextStyle: LayerStyle =
                        command.payload.mode === "graduated"
                            ? {
                                ...executionContext.layerStyle,
                                symbologyMode: "graduated",
                                graduatedField:
                                    command.payload.field,
                                classificationMethod:
                                    command.payload.method,
                                classCount:
                                    command.payload.classCount,
                                colorRamp:
                                    command.payload.colorRamp,
                                graduatedClasses: [],
                            }
                            : {
                                ...executionContext.layerStyle,
                                symbologyMode:
                                    command.payload.mode,
                                graduatedClasses: [],
                            };

                    executionContext.layerStyle = nextStyle;
                    setLayerStyle(nextStyle);

                    return {
                        success: true,
                        message:
                            command.payload.mode === "graduated"
                                ? `已按 ${command.payload.field} 应用 ${command.payload.classCount} 级专题制图。`
                                : `已切换为 ${command.payload.mode === "categorized" ? "唯一值" : "单一符号"} 渲染。`,
                    };
                }

                case "set_analysis_layer_visibility": {
                    const layerExists =
                        executionContext.analysisResultLayers.some(
                            (layer) => layer.id === command.layerId,
                        );

                    if (!layerExists) {
                        return {
                            success: false,
                            message: "指定的分析结果图层不存在。",
                        };
                    }

                    executionContext.analysisResultLayers =
                        executionContext.analysisResultLayers.map(
                            (layer) =>
                                layer.id === command.layerId
                                    ? {
                                        ...layer,
                                        visible: command.visible,
                                    }
                                    : layer,
                        );
                    setAnalysisResultLayers(
                        executionContext.analysisResultLayers,
                    );

                    return {
                        success: true,
                        message: command.visible
                            ? "已显示分析结果图层。"
                            : "已隐藏分析结果图层。",
                    };
                }
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error
                    ? error.message
                    : "GIS 命令执行失败。",
            };
        }
    }

    function isAgentMutationCommand(
        command: AgentCommand,
    ) {
        return command.type !== "fit_map_bounds" &&
            command.type !== "navigate_statistics";
    }

    function handleExecuteAgentPlan(
        plan: AgentPlan,
    ): AgentPlanExecutionResult {
        const snapshot = createAgentSnapshot();
        const executionContext = createAgentExecutionContext();
        const events: AgentExecutionEvent[] = [];
        let snapshotStored = false;

        for (
            let index = 0;
            index < plan.commands.length;
            index += 1
        ) {
            const command = plan.commands[index];
            const result = executeAgentCommand(
                command,
                executionContext,
            );
            const event: AgentExecutionEvent = {
                commandType: command.type,
                status: result.success ? "success" : "error",
                message: result.message,
                timestamp: Date.now(),
                stepIndex: index,
            };

            events.push(event);

            if (
                result.success &&
                isAgentMutationCommand(command) &&
                !snapshotStored
            ) {
                setLastAgentSnapshot(snapshot);
                snapshotStored = true;
            }

            if (!result.success) {
                setAgentExecutionEvents((previous) => [
                    ...previous,
                    ...events,
                ]);
                return {
                    events,
                    completed: false,
                    stoppedAtStep: index,
                };
            }
        }

        if (events.length > 0) {
            setAgentExecutionEvents((previous) => [
                ...previous,
                ...events,
            ]);
        }

        return {
            events,
            completed: true,
            stoppedAtStep: null,
        };
    }

    function handleUndoAgentAction() {
        if (!lastAgentSnapshot) {
            return;
        }
        dispatch({
            type: "REPLACE_FILTERS",
            payload: lastAgentSnapshot.filters,
        });
        agentHandledFilterClearRef.current = true;
        setLayerStyle(lastAgentSnapshot.layerStyle);
        setBufferFeature(lastAgentSnapshot.bufferFeature);
        setBufferResult(lastAgentSnapshot.bufferResult);
        setBufferError(lastAgentSnapshot.bufferError);
        setSpatialQueryFeatures(
            lastAgentSnapshot.spatialQueryFeatures,
        );
        setSpatialQueryResult(
            lastAgentSnapshot.spatialQueryResult,
        );
        setSpatialQueryError(
            lastAgentSnapshot.spatialQueryError,
        );
        setAoiRelation(lastAgentSnapshot.aoiRelation);
        setAoiQueryFeatures(
            lastAgentSnapshot.aoiQueryFeatures,
        );
        setAoiAnalysisResult(
            lastAgentSnapshot.aoiAnalysisResult,
        );
        setAoiQueryError(lastAgentSnapshot.aoiQueryError);
        setAnalysisResultLayers(
            lastAgentSnapshot.analysisResultLayers,
        );
        setGeoprocessingSummary(
            lastAgentSnapshot.geoprocessingSummary,
        );
        setGeoprocessingError(
            lastAgentSnapshot.geoprocessingError,
        );
        setLastAgentSnapshot(null);
    }


    const workspaceClassName =
        activePanel === "agent"
            ? "workspace-page panel-open agent-open"
            : sidePanelOpen
                ? "workspace-page panel-open"
                : "workspace-page";
    // const features = state.dataset?.collection.features;
    // console.log({requestedPanel,activePanel,});
    return (
        <section className={workspaceClassName}>
            <WorkspaceToolbar
                activeTool={activeTool}
                activePanel={activePanel}
                onToolChange={(tool) => {
                    if (geometryEditor.mode !== "idle") {
                        setGeometryAbandonConfirmationOpen(true);
                        return;
                    }

                    setActiveTool(tool);
                }}
                onPanelToggle={handlePanelToggle}
                onFitAll={() => {
                    requestMapView(
                        "fit-all",
                    );
                }}
                onFitSelected={() => {
                    requestMapView(
                        "fit-selected",
                    );
                }}
                canFitSelected={
                    selectedFeature != null
                }
                measureMode={measureMode}

                onMeasureChange={(mode)=>{
                    if (geometryEditor.mode !== "idle") {
                        setGeometryAbandonConfirmationOpen(true);
                        return;
                    }

                    startMeasure(mode);
                }}
                onAddOverlayLayer={(file) => {
                    void handleAddOverlayLayer(file);
                }}
                overlayImporting={overlayImporting}
                compareMode={temporalCompareConfig.enabled}
            />

            <main className="workspace-map-area">
                <header className="workspace-map-header">
                    <div>
                        <h1>地图工作台</h1>

                        <p>
                            {dataset.name}
                            {" · "}
                            {temporalCompareConfig.enabled && temporalCompareSummary
                                ? `前期 ${temporalCompareSummary.beforeFeatureCount} / 后期 ${temporalCompareSummary.afterFeatureCount} 条要素`
                                : `当前 ${temporalFeatures.length} / ${totalFeatureCount} 条要素`}
                        </p>
                    </div>
                </header>

                <div className="workspace-map-wrapper">
                    {temporalCompareConfig.enabled ? (
                        <TemporalMapCompareView
                            beforeCollection={temporalCompareBeforeCollection}
                            afterCollection={temporalCompareAfterCollection}
                            beforeLabel={formatTemporalValue(
                                temporalCompareConfig.beforeTime,
                                temporalConfig.type,
                            )}
                            afterLabel={formatTemporalValue(
                                temporalCompareConfig.afterTime,
                                temporalConfig.type,
                            )}
                            config={temporalCompareConfig}
                            layerStyle={temporalCompareLayerStyle}
                            basemap={basemap}
                            initialViewState={{ ...projectMapState, basemap }}
                            captureRequestId={temporalCompareCaptureRequestId}
                            onCapture={handleTemporalCompareCapture}
                            onViewStateChange={handleProjectMapStateChange}
                        />
                    ) : (
                    <MapView
                        collection={
                            temporalCollection
                        }
                        allCollection={
                            dataset.collection
                        }
                        interactionMode={activeTool}
                        layerStyle={thematicLayerStyle}
                        temporalConfig={temporalConfig}
                        basemap={basemap}
                        restoreViewState={restoreViewState}
                        onViewStateChange={handleProjectMapStateChange}
                        selectedFeatureId={
                            geometryEditor.mode === "idle"
                                ? selectedFeature?.properties.id ?? null
                                : null
                        }
                        selectedFeatureIds={
                            geometryEditor.mode === "idle"
                                ? selectedFeatureIds
                                : []
                        }
                        viewCommand={
                            mapViewCommand
                        }

                        bufferFeature={
                            bufferFeature
                        }

                        spatialQueryFeatures={
                            spatialQueryFeatures
                        }

                        aoiMode={aoiMode}

                        aoiPoints={aoiPoints}

                        aoiPolygon={aoiPolygon}

                        aoiQueryFeatures={aoiQueryFeatures}

                        analysisResultLayers={analysisResultLayers}

                        spatialHeatmapData={spatialHeatmapData}

                        spatialStatisticsConfig={spatialStatisticsConfig}

                        overlayLayers={overlayLayers}

                        rasterLayers={rasterLayers}

                        qualityIssueFeatures={qualityIssueFeatures}

                        selectedQualityIssueId={selectedQualityIssueId}

                        searchResultFeature={searchResultFeature}

                        searchLocation={searchLocation}

                        captureRequestId={mapCaptureRequestId}

                        onMapCapture={handleMapCapture}

                        geometryEditMode={geometryEditor.mode}

                        geometryDraftCoordinates={geometryEditor.draftCoordinates}

                        geometryActiveVertexIndex={geometryEditor.activeVertexIndex}

                        geometrySnapCandidates={geometrySnapCandidates}

                        geometrySnappingEnabled={geometryEditor.snappingEnabled}

                        onFeatureSelect={handleFeatureSelect}
                        measureMode={
                            measureMode
                        }

                        measurePoints={
                            measurePoints
                        }

                        measureCompleted={
                            measureCompleted
                        }

                        onMeasurePointAdd={addMeasurePoint}

                        onMeasureComplete={completeMeasure}

                        onAoiPointAdd={addAoiPoint}

                        onAoiComplete={completeAoi}

                        onGeometryVertexAdd={geometryEditor.addVertex}

                        onGeometryDrawingComplete={handleCompleteGeometryDrawing}

                        onGeometryVertexMove={geometryEditor.moveVertex}

                        onGeometryActiveVertexChange={geometryEditor.setActiveVertex}
                    />
                    )}

                    {overlayImportError && (
                        <div
                            className="overlay-import-error"
                            role="alert"
                        >
                            <span>{overlayImportError}</span>
                            <button
                                type="button"
                                aria-label="关闭导入错误"
                                onClick={() => {
                                    setOverlayImportError(null);
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {!temporalCompareConfig.enabled && <MeasureResult

                        mode={
                            measureMode
                        }

                        value={
                            measureValue
                        }

                        points={measurePoints}

                        isComplete={measureCompleted}

                        onRestart={restartMeasure}

                        onClear={clearMeasure}

                    />}

                    {!temporalCompareConfig.enabled && <TimelineControl
                        config={temporalConfig}
                        values={temporalValues}
                        onCurrentChange={(current) => {
                            setTemporalConfig((previous) => ({
                                ...previous,
                                current,
                            }));
                        }}
                    />}

                    {!temporalCompareConfig.enabled && temporalFeatures.length === 0 && (
                        <div className="map-empty-overlay">
                            <strong>
                                {temporalConfig.enabled
                                    ? "当前时间无匹配结果"
                                    : "当前筛选无匹配结果"}
                            </strong>

                            <span>
                                {temporalConfig.enabled
                                    ? "请选择其它时间，或关闭时间过滤"
                                    : "请调整或清除筛选条件"}
                            </span>
                        </div>
                    )}
                </div>
            </main>

            {/* workspacepage持有唯一的activePanel
            子组件通过callback请求修改 */}

            {activePanel === "filter" && (
                <FilterPanel />
            )}
            {activePanel === "layers" && (
                <LayerPanel
                    layerStyle={thematicLayerStyle}
                    overlayLayers={overlayLayers}
                    rasterLayers={rasterLayers}
                    analysisResultLayers={analysisResultLayers}
                    temporalConfig={temporalConfig}
                    focusedLayerId={focusedLayerId}
                    onLayerStyleChange={(nextStyle) => {
                        setLayerStyle({
                            ...nextStyle,
                            graduatedClasses: [],
                        });
                    }}
                    onAnalysisLayerVisibilityChange={
                        handleAnalysisLayerVisibilityChange
                    }
                    onDeleteAnalysisLayer={
                        handleDeleteAnalysisLayer
                    }
                    onExportAnalysisLayer={
                        handleExportAnalysisLayer
                    }
                    onOverlayVisibilityChange={
                        handleToggleOverlayLayer
                    }
                    onOverlayOpacityChange={
                        handleOverlayOpacityChange
                    }
                    onOverlayStyleChange={
                        handleOverlayStyleChange
                    }
                    onMoveOverlayLayerUp={
                        handleMoveOverlayLayerUp
                    }
                    onMoveOverlayLayerDown={
                        handleMoveOverlayLayerDown
                    }
                    onFitOverlayLayer={
                        handleFitOverlayLayer
                    }
                    onExportOverlayLayer={
                        handleExportOverlayLayer
                    }
                    onRemoveOverlayLayer={
                        handleRemoveOverlayLayer
                    }
                    onRefreshOverlayLayer={(layerId) => {
                        void handleRefreshOverlayLayer(layerId);
                    }}
                    refreshingOverlayLayerId={refreshingOverlayLayerId}
                    onRasterVisibilityChange={handleToggleRasterLayer}
                    onRasterOpacityChange={handleRasterOpacityChange}
                    onMoveRasterLayerUp={(layerId) => moveRasterLayer(layerId, -1)}
                    onMoveRasterLayerDown={(layerId) => moveRasterLayer(layerId, 1)}
                    onRemoveRasterLayer={handleRemoveRasterLayer}
                    onClose={() => {
                        setActivePanel(null,);
                    }}
                    onOpenStyle={() => {
                        setActivePanel("style");
                    }}             // 实际是在创建一个对象 相当于
                // const props={
                // onOpenStyle:()=>{
                //  setActivePanel("style");}}

                // react将该对象传给
                // function LayerPanel(props){}

                />

            )
            }
            {activePanel ===
                "table" && (
                    <FeatureTablePanel
                        features={
                            filteredFeatures
                        }

                        selectedFeatureId={
                            selectedFeature
                                ?.properties.id ??
                            null
                        }

                        selectedFeatureIds={selectedFeatureIds}

                        editMessage={editMessage}

                        canUndo={editHistory.canUndo}

                        canRedo={editHistory.canRedo}

                        onFeatureSelect={
                            handleTableFeatureSelect
                        }

                        onToggleSelection={handleToggleFeatureSelection}

                        onSelectAll={handleSelectAllFilteredFeatures}

                        onInvertSelection={handleInvertFilteredSelection}

                        onClearSelection={handleClearFeatureSelection}

                        onBatchEdit={() => setActivePanel("batch-edit")}

                        onFitSelection={handleFitFeatureSelection}

                        onExportSelectionGeoJson={handleExportSelectionGeoJson}

                        onExportSelectionCsv={handleExportSelectionCsv}

                        onUndo={handleUndoEdit}

                        onRedo={handleRedoEdit}

                        onExport={
                            handleExportGeoJSON
                        }

                        onClose={() => {
                            setActivePanel(
                                null,
                            );
                        }}
                    />
                )}

            {activePanel === "batch-edit" && (
                <BatchEditPanel
                    features={selectedFeatures}
                    history={[
                        ...editHistory.undoStack,
                        ...editHistory.redoStack,
                    ].sort((first, second) =>
                        first.timestamp - second.timestamp,
                    )}
                    canUndo={editHistory.canUndo}
                    canRedo={editHistory.canRedo}
                    onApply={handleApplyBatchEdit}
                    onUndo={handleUndoEdit}
                    onRedo={handleRedoEdit}
                    onClose={() => setActivePanel("table")}
                />
            )}
            {activePanel === "basemap" && (
                <BasemapPanel
                    value={
                        basemap
                    }

                    onChange={
                        setBasemap
                    }

                    onClose={() =>
                        setActivePanel(
                            null,
                        )
                    }
                />
            )}
            {activePanel === "style" && (
                <LayerStylePanel
                    style={thematicLayerStyle}
                    onChange={updateLayerStyle}
                    onReset={handleResetStyle}
                    onApplyReset={handleApplyPreset}
                    onSave={handleSaveStyle}
                    hasUnsavedChanges={
                        hasUnsavedChanges
                    }
                />
            )}

            {activePanel === "aoi-analysis" && (
                <AoiAnalysisPanel
                    mode={aoiMode}
                    pointCount={aoiPoints.length}
                    relation={aoiRelation}
                    result={aoiAnalysisResult}
                    error={aoiQueryError}
                    onRelationChange={handleAoiRelationChange}
                    onStart={handleStartAoi}
                    onRestart={handleRestartAoi}
                    onCancelDrawing={handleClearAoiAnalysis}
                    onRunQuery={handleRunAoiQuery}
                    onExportGeoJson={handleExportAoiGeoJson}
                    onExportCsv={handleExportAoiCsv}
                    onClear={handleClearAoiAnalysis}
                    onClose={() => {
                        setActivePanel(null);
                    }}
                />
            )}

            {activePanel === "geoprocessing" && (
                <GeoprocessingPanel
                    filteredCount={filteredFeatures.length}
                    aoiQueryCount={aoiQueryFeatures.length}
                    bufferQueryCount={spatialQueryFeatures.length}
                    hasAoi={aoiPolygon !== null}
                    hasBuffer={bufferFeature !== null}
                    summary={geoprocessingSummary}
                    error={geoprocessingError}
                    onRun={handleRunGeoprocessing}
                    onClearFeedback={() => {
                        setGeoprocessingSummary(null);
                        setGeoprocessingError(null);
                    }}
                    onClose={() => {
                        setActivePanel(null);
                    }}
                />
            )}

            {activePanel === "data-quality" && (
                <DataQualityPanel
                    targets={qualityTargets}
                    targetId={qualityTargetId}
                    report={dataQualityReport}
                    selectedIssueId={selectedQualityIssueId}
                    scanning={qualityScanning}
                    error={qualityError}
                    cleanedDataset={cleanedDataset}
                    cleanedReport={cleanedQualityReport}
                    onTargetChange={handleQualityTargetChange}
                    onRunScan={handleRunQualityScan}
                    onSelectIssue={handleSelectQualityIssue}
                    onCreateCleanedDataset={handleCreateCleanedDataset}
                    onAddCleanedLayer={handleAddCleanedLayer}
                    onExportCleaned={handleExportCleanedDataset}
                    onExportReport={handleExportQualityReport}
                    onRescanCleaned={handleRescanCleanedDataset}
                    onClose={() => setActivePanel(null)}
                />
            )}

            {activePanel === "report-builder" && (
                <ReportBuilderPanel
                    draft={reportDraft}
                    currentWorkspaceRevision={workspaceRevision}
                    hasDataQualityReport={dataQualityReport !== null}
                    hasTemporalComparison={
                        temporalCompareConfig.enabled ||
                        temporalCompareSnapshot !== null
                    }
                    snapshotStatus={reportSnapshotStatus}
                    aiStatus={reportAiStatus}
                    message={reportBuilderMessage}
                    onGenerateSnapshot={(config) => {
                        void handleGenerateReportSnapshot(config);
                    }}
                    onGenerateAiInsights={() => {
                        void handleGenerateReportAiInsights();
                    }}
                    onDraftChange={(draft) => setReportDraft(draft)}
                    onPreview={() => navigate("/report")}
                    onClose={() => {
                        setActivePanel(null);
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.delete("panel");
                        setSearchParams(nextParams, { replace: true });
                    }}
                />
            )}

            {activePanel === "data-sources" && (
                <DataSourcePanel
                    overlayLayerCount={overlayLayers.length}
                    rasterLayers={rasterLayers}
                    onAddVectorLayer={addWorkspaceVectorLayer}
                    onAddRasterLayer={handleAddRasterLayer}
                    onClose={() => setActivePanel(null)}
                />
            )}

            {activePanel === "temporal" && (
                <TemporalConfigPanel
                    candidates={temporalCandidates}
                    config={temporalConfig}
                    statistics={temporalStatistics}
                    change={temporalChange}
                    onApply={setTemporalConfig}
                    onClose={() => setActivePanel(null)}
                />
            )}

            {activePanel === "temporal-compare" && (
                <TemporalComparePanel
                    temporalConfig={temporalConfig}
                    availableValues={temporalCompareValues}
                    config={temporalCompareConfig}
                    summary={temporalCompareSummary}
                    snapshot={temporalCompareSnapshot}
                    capturing={temporalCompareCapturing}
                    error={temporalCompareError}
                    onConfigChange={(config) => {
                        setTemporalCompareConfig(config);
                        setTemporalCompareError(null);
                        setTemporalCompareSnapshot(null);
                    }}
                    onEnter={handleEnterTemporalCompare}
                    onExit={handleExitTemporalCompare}
                    onCapture={() => {
                        void handleCaptureTemporalCompareSnapshot();
                    }}
                    onOpenTemporalConfig={() => {
                        setActivePanel("temporal");
                    }}
                    onClose={() => setActivePanel(null)}
                />
            )}

            {activePanel === "spatial-statistics" && (
                <SpatialStatisticsPanel
                    inputs={spatialStatisticsInputOptions}
                    config={spatialStatisticsConfig}
                    summary={spatialStatisticsSummary}
                    analyzing={spatialStatisticsAnalyzing}
                    error={spatialStatisticsError}
                    heatmapVisible={spatialHeatmapData !== null}
                    onRun={handleRunSpatialStatistics}
                    onClearHeatmap={handleClearSpatialHeatmap}
                    onFitHotspot={handleFitSpatialHotspot}
                    onClose={() => setActivePanel(null)}
                />
            )}

            {activePanel === "geometry-edit" && (
                <GeometryEditPanel
                    mode={geometryEditor.mode}
                    selectedFeature={selectedFeature}
                    editingFeatureId={geometryEditor.editingFeatureId}
                    pendingFeatureId={pendingFeatureId}
                    vertexCount={geometryEditor.draftCoordinates.length}
                    activeVertexIndex={geometryEditor.activeVertexIndex}
                    snappingEnabled={geometryEditor.snappingEnabled}
                    draftAreaM2={geometryDraftAreaM2}
                    validationError={geometryValidationError}
                    deleteConfirmationOpen={geometryDeleteConfirmationOpen}
                    abandonConfirmationOpen={geometryAbandonConfirmationOpen}
                    canUndo={editHistory.canUndo}
                    canRedo={editHistory.canRedo}
                    onStartCreate={handleStartGeometryCreate}
                    onStartEdit={handleStartGeometryEdit}
                    onCompleteCreate={handleCreateGeometryFeature}
                    onSaveEdit={handleSaveGeometryEdit}
                    onDeleteActiveVertex={geometryEditor.deleteActiveVertex}
                    onToggleSnapping={geometryEditor.toggleSnapping}
                    onRequestDelete={() => handleRequestGeometryDelete()}
                    onCancelDelete={() => setGeometryDeleteConfirmationOpen(false)}
                    onConfirmDelete={handleConfirmGeometryDelete}
                    onCancelDraft={handleCancelGeometryDraft}
                    onRequestAbandon={() => setGeometryAbandonConfirmationOpen(true)}
                    onCancelAbandon={() => setGeometryAbandonConfirmationOpen(false)}
                    onUndo={handleUndoEdit}
                    onRedo={handleRedoEdit}
                    onClose={() => {
                        setGeometryDeleteConfirmationOpen(false);
                        setActivePanel(null);
                    }}
                />
            )}

            {activePanel === "feature" && selectedFeature && (
                <FeatureInfoPanel
                    feature={selectedFeature}
                    onClose={handleCloseFeatureInfo}
                    onCreateBuffer={handleCreateBuffer}
                    onClearBuffer={handleClearBuffer}
                    bufferResult={bufferResult}
                    bufferError={bufferError}
                    spatialQueryResult={spatialQueryResult}
                    spatialQueryError={spatialQueryError}
                    onRunSpatialQuery={handleRunSpatialQuery}
                    onClearSpatialQuery={handleClearSpatialQuery}
                    onEditGeometry={handleStartGeometryEdit}
                    onDeleteFeature={handleRequestGeometryDelete}
                />
            )}

            {activePanel === "agent" && (
                <AgentPanel
                    context={agentContext}
                    onExecutePlan={handleExecuteAgentPlan}
                    executionEvents={agentExecutionEvents}
                    onClose={
                        handleCloseAgent
                    }
                    canUndo={lastAgentSnapshot !== null}
                    onUndo={handleUndoAgentAction}
                />
            )}


        </section>
    );
}
