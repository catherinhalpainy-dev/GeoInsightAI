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
import type { AgentContext, AgentPlan } from "../types/agent";
import type { LandUseFilters } from "../app/appTypes";
import { FeatureInfoPanel } from "../components/workspace/FeatureInfoPanel";
import { BasemapPanel } from "../components/workspace/BasemapPanel";
import { FeatureTablePanel, } from "../components/workspace/FeatureTablePanel";
import { AoiAnalysisPanel } from "../components/workspace/AoiAnalysisPanel";
import { GeoprocessingPanel } from "../components/workspace/GeoprocessingPanel";

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
// section 表示一个独立的页面功能区域

interface AgentSnapshot {
    filters: LandUseFilters,
    layerStyle: LayerStyle,
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
            "fit-overlay"
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
    const [geoprocessingSummary, setGeoprocessingSummary] =
        useState<GeoprocessingRunSummary | null>(null);
    const [geoprocessingError, setGeoprocessingError] =
        useState<string | null>(null);
    const analysisLayerSequenceRef = useRef(0);

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

    function handleRunAoiQuery() {
        if (!aoiPolygon) {
            setAoiQueryError(
                "请先完成 AOI 范围绘制",
            );
            return;
        }

        try {
            const nextFeatures =
                queryFeaturesByGeometry(
                    filteredCollection,
                    aoiPolygon,
                    aoiRelation,
                );
            const nextResult =
                summarizeSpatialQuery(
                    nextFeatures,
                    aoiRelation,
                );

            setAoiQueryFeatures(nextFeatures);
            setAoiAnalysisResult(nextResult);
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
            setActivePanel(
                (previous) =>
                    previous ===
                        "feature"
                        ? null
                        : previous,
            );

            return;
        }


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


        setShouldFitSelected(
            true,
        );


        /*
         * 保持属性表开启。
         *
         * 不切换到 FeatureInfoPanel。
         */
    }

    function handleCreateBuffer(
        feature: LandUseFeature,
        distance: number,
    ) {
        handleClearSpatialQuery();

        try {
            const nextBufferFeature =
                createBuffer(feature, distance);
            const areaM2 =
                calculateBufferAreaM2(nextBufferFeature);

            setBufferFeature(nextBufferFeature);
            setBufferResult({
                distance,
                unit: "meter",
                areaM2,
                areaKm2: areaM2 / 1_000_000,
                featureCount: 1,
            });
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
            const nextFeatures =
                queryFeaturesByGeometry(
                    filteredCollection,
                    bufferFeature,
                    relation,
                );

            setSpatialQueryFeatures(nextFeatures);
            setSpatialQueryResult(
                summarizeSpatialQuery(
                    nextFeatures,
                    relation,
                ),
            );
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

    function handleRunGeoprocessing(
        request: GeoprocessingRunRequest,
    ) {
        const startedAt = performance.now();
        const inputCollection =
            resolveGeoprocessingInput(
                request.inputSource,
            );

        if (inputCollection.features.length === 0) {
            setGeoprocessingSummary(null);
            setGeoprocessingError(
                "所选输入图层没有可处理的要素",
            );
            return;
        }

        try {
            let resultCollection:
                AnalysisResultFeatureCollection;

            if (request.operation === "intersection") {
                const overlay =
                    request.overlaySource === "aoi"
                        ? aoiPolygon
                        : bufferFeature;

                if (!overlay) {
                    throw new Error(
                        request.overlaySource === "aoi"
                            ? "请先完成 AOI 绘制"
                            : "请先创建 Buffer",
                    );
                }

                resultCollection =
                    intersectFeaturesWithGeometry(
                        inputCollection,
                        overlay,
                    );

                if (resultCollection.features.length === 0) {
                    throw new Error(
                        "叠加范围与输入图层没有面积交集",
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
            const nextLayer: AnalysisResultLayer = {
                id: layerId,
                name: getGeoprocessingLayerName(request),
                operation: request.operation,
                geometryType:
                    getAnalysisGeometryType(
                        resultCollection,
                    ),
                visible: true,
                createdAt,
                featureCount:
                    resultCollection.features.length,
                collection: resultCollection,
            };
            const elapsedMs =
                performance.now() - startedAt;

            setAnalysisResultLayers(
                (previous) => [
                    ...previous,
                    nextLayer,
                ],
            );
            setGeoprocessingSummary({
                layerId,
                operation: request.operation,
                inputCount:
                    inputCollection.features.length,
                outputCount:
                    resultCollection.features.length,
                totalAreaM2:
                    request.operation === "intersection"
                        ? calculateAnalysisAreaM2(
                            resultCollection,
                        )
                        : undefined,
                elapsedMs,
            });
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

    const [lastAgentSnapshot, setlastAgentSnapshot] = useState<AgentSnapshot | null>(null,);

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

    const agentContext: AgentContext = {
        datasetName: dataset.name,
        featureCount: filteredFeatures.length,
        currentFilters: {
            landUseTypes: state.filters.landUseTypes,
            minimumBuiltYear: state.filters.minimumBuiltYear,
            districtCode: state.filters.districtCode,
        },
        currentLayerStyle: layerStyle,
    };

    function handleExecuteAgentPlan(
        plan: AgentPlan,
    ) {
        setlastAgentSnapshot({
            filters: {
                ...state.filters,

                landUseTypes: [
                    ...state.filters.landUseTypes,
                ],
            },
            layerStyle: {
                ...layerStyle,
            },
        });
        for (
            const command
            of plan.commands
        ) {
            switch (
            command.type
            ) {

                case "apply_filter": {
                    dispatch({
                        type:
                            "PATCH_FILTERS",

                        payload:
                            command.payload,
                    });

                    break;
                }


                case "clear_filters": {
                    dispatch({
                        type:
                            "CLEAR_FILTERS",
                    });

                    break;
                }


                case "update_layer_style": {
                    const {
                        colorMode,
                        ...styleUpdates
                    } = command.payload;

                    setLayerStyle(
                        (previous) => {
                            return {
                                ...previous,
                                ...styleUpdates,
                                symbologyMode:
                                    colorMode === undefined
                                        ? previous.symbologyMode
                                        : colorMode === "classified"
                                            ? "categorized"
                                            : "single",
                            };
                        },
                    );

                    break;
                }


                case "navigate_statistics": {
                    navigate(
                        "/statistics",
                    );

                    break;
                }


                case "fit_map_bounds": {
                    requestMapView(
                        "fit-current",
                    );

                    break;
                }
            }
        }
    };

    function handleUndoAgentAction() {
        if (!lastAgentSnapshot) {
            return;
        }
        dispatch({
            type: "REPLACE_FILTERS",
            payload: lastAgentSnapshot.filters,
        });
        setLayerStyle({
            ...lastAgentSnapshot.layerStyle,
        });
        setlastAgentSnapshot(null);
    };


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
                onToolChange={setActiveTool}
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
                            selectedFeature
                                ?.properties.id ??
                            null
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

                        onFeatureSelect={
                            handleTableFeatureSelect
                        }

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
                />
            )}

            {activePanel === "agent" && (
                <AgentPanel
                    context={agentContext}
                    onExecutePlan={handleExecuteAgentPlan}
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
