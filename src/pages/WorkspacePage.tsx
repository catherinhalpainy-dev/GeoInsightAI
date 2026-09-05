// 地图工作台界面
// 组件名称首字母大写
// section             HTML 元素
// DataImportPage      React 组件
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../app/AppProvider";
import { MapView } from "../components/map/MapView";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
    DataQualityPanel,
    type DataQualityTargetOption,
} from "../components/workspace/DataQualityPanel";

import { MeasureResult } from "../components/map/measure/MeasureResult";
import { useMeasure } from "../hooks/useMeasure";
import { useAoiSketch } from "../hooks/useAoiSketch";
import type {
    AoiAnalysisResult,
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
} from "../types/mapLayer";
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


export function WorkspacePage() {
    const navigate = useNavigate();
    const [
        basemap,
        setBasemap,
    ] = useState<BasemapType>(
        "dark",
    );
    const [searchParams, setSearchParams,] = useSearchParams();

    const { state, dispatch, filteredFeatures, } = useAppContext();

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

    function requestMapView(
        type: Exclude<
            MapViewCommandType,
            "fit-overlay" | "fit-quality-issue"
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
    } = useAoiSketch();
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
    const [overlayImportError, setOverlayImportError] =
        useState<string | null>(null);
    const [overlayImporting, setOverlayImporting] =
        useState(false);
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
    const editHistory = useEditHistory(30);
    const geometryEditor = useGeometryEditor();
    const [pendingFeatureId, setPendingFeatureId] =
        useState<string | null>(null);
    const [geometryValidationError, setGeometryValidationError] =
        useState<string | null>(null);
    const [geometryDeleteConfirmationOpen, setGeometryDeleteConfirmationOpen] =
        useState(false);
    const [geometryAbandonConfirmationOpen, setGeometryAbandonConfirmationOpen] =
        useState(false);

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
            );

            setOverlayLayers((previous) => {
                const layerName = getUniqueOverlayLayerName(
                    parsedLayer.name,
                    previous,
                );

                return [
                    ...previous,
                    {
                        ...parsedLayer,
                        name: layerName,
                        style: createDefaultOverlayLayerStyle(
                            previous.length,
                            parsedLayer.geometryKind,
                        ),
                    },
                ];
            });
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
        if (requestedPanel === "agent") {
            setActivePanel("agent",);
            return;
        }
        setActivePanel((previousPanel) => {
            return previousPanel === "agent"
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

        if (searchParams.get("panel",) === "agent") {
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
                filteredFeatures,
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
            filteredFeatures,
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

    if (!dataset ||
        state.importStatus !== "loaded") {
        return (
            <section className="page-content">
                <h1>地图工作台</h1>
                <p>尚未正式加载空间数据。</p>
                <Link to="/import">
                    前往数据导入
                </Link>
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
        analysisLayers: analysisResultLayers.map(
            (layer) => ({
                id: layer.id,
                name: layer.name,
                operation: layer.operation,
                featureCount: layer.featureCount,
                visible: layer.visible,
            }),
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
            />

            <main className="workspace-map-area">
                <header className="workspace-map-header">
                    <div>
                        <h1>地图工作台</h1>

                        <p>
                            {dataset.name}
                            {" · "}
                            当前 {filteredFeatures.length}
                            {" / "}
                            {totalFeatureCount} 条要素
                        </p>
                    </div>
                </header>

                <div className="workspace-map-wrapper">
                    <MapView
                        collection={
                            filteredCollection
                        }
                        allCollection={
                            dataset.collection
                        }
                        interactionMode={activeTool}
                        layerStyle={thematicLayerStyle}
                        basemap={basemap}
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

                        overlayLayers={overlayLayers}

                        qualityIssueFeatures={qualityIssueFeatures}

                        selectedQualityIssueId={selectedQualityIssueId}

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

                    <MeasureResult

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

                    />

                    {filteredFeatures.length === 0 && (
                        <div className="map-empty-overlay">
                            <strong>
                                当前筛选无匹配结果
                            </strong>

                            <span>
                                请调整或清除筛选条件
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
                    analysisResultLayers={analysisResultLayers}
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
