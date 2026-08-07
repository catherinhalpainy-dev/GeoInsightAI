// 地图工作台界面
// 组件名称首字母大写
// section             HTML 元素
// DataImportPage      React 组件

import { Link } from "react-router-dom";
import { useAppContext } from "../app/AppProvider";
import { MapView } from "../components/map/MapView";
import { useMemo, useState } from "react";
import type { LandUseFeatureCollection } from "../types/landUse";
import { FilterPanel } from "../components/filter/FilterPanel";
import { WorkspaceToolbar } from "../components/workspace/WorkspaceToolbar";
import "../styles/workspace.css";
import type { WorkspacePanel, WorkspaceTool } from "../types/workspace";
import { LayerPanel } from "../components/layers/LayerPanel";

// section 表示一个独立的页面功能区域
export function WorkspacePage() {
    const { state, filteredFeatures, } = useAppContext();

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
        layerVisible,
        setLayerVisible,
    ] = useState(true);

    function handlePanelToggle(panel: Exclude<WorkspacePanel, null>,) {
        setActivePanel(
            // 新值依赖于旧值
            (previousPanel) => {
                return previousPanel === panel
                    ? null
                    : panel;
            },
        );
    }
    const siderPanelOpen =
        activePanel !== null;



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

    const totalFeaturesCount =
        state.dataset?.collection.features.length;


    // const features = state.dataset?.collection.features;
    return (
        <section className={
            siderPanelOpen
                ? "workspace-page panel-open"
                : "workspace-page"
        }>
            <WorkspaceToolbar
                activeTool={activeTool}
                activePanel={activePanel}
                onToolChange={setActiveTool}
                onPanelToggle={handlePanelToggle}
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
                            {totalFeaturesCount} 条要素
                        </p>
                    </div>
                </header>

                <div className="workspace-map-wrapper">
                    <MapView
                        collection={
                            filteredCollection
                        }
                        layerVisible={layerVisible}
                        interactionMode={activeTool}
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

            {activePanel==="filter" && (
                <FilterPanel />
            )}
            {activePanel==="layers"&&(
                <LayerPanel
                layerVisible={layerVisible}
                onLayerVisibleChange={setLayerVisible}
/>
            )

            }
        </section>
    );
}