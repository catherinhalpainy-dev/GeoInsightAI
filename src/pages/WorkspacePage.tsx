// 地图工作台界面
// 组件名称首字母大写
// section             HTML 元素
// DataImportPage      React 组件
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../app/AppProvider";
import { MapView } from "../components/map/MapView";
import { useEffect, useMemo, useState } from "react";
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

import { MeasureResult } from "../components/map/measure/MeasureResult";
import { useMeasure } from "../hooks/useMeasure";
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

    function requestMapView(type: MapViewCommandType,) {
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
        if (
            filteredFeatures.length === 0
        ) {
            return;
        }


        const collection:
            LandUseFeatureCollection = {
            type:
                "FeatureCollection",

            features:
                filteredFeatures,
        };


        const json =
            JSON.stringify(
                collection,
                null,
                2,
            );


        const blob =
            new Blob(
                [json],
                {
                    type:
                        "application/geo+json;charset=utf-8",
                },
            );


        const url =
            URL.createObjectURL(
                blob,
            );


        const anchor =
            document.createElement(
                "a",
            );


        anchor.href =
            url;

        anchor.download =
            `geoinsight-filtered-${Date.now()}.geojson`;


        document.body.appendChild(
            anchor,
        );


        anchor.click();


        document.body.removeChild(
            anchor,
        );


        URL.revokeObjectURL(
            url,
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
                    setLayerStyle(
                        (previous) => {
                            return {
                                ...previous,
                                ...command.payload,
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
                        layerStyle={layerStyle}
                        basemap={basemap}
                        selectedFeatureId={
                            selectedFeature
                                ?.properties.id ??
                            null
                        }
                        viewCommand={
                            mapViewCommand
                        }

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
                    />

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
                    layerStyle={layerStyle}
                    onLayerStyleChange={setLayerStyle}
                    onMoveUp={() => {
                        requestMapView(
                            "layer-up",
                        );
                    }}
                    onMoveDown={() => {
                        requestMapView
                            (
                                "layer-down",
                            );
                    }}
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
                    style={layerStyle}
                    onChange={updateLayerStyle}
                    onReset={handleResetStyle}
                    onApplyReset={handleApplyPreset}
                    onSave={handleSaveStyle}
                    hasUnsavedChanges={
                        hasUnsavedChanges
                    }
                />
            )}

            {activePanel === "feature" && selectedFeature && (
                <FeatureInfoPanel
                    feature={selectedFeature}
                    onClose={handleCloseFeatureInfo}
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
