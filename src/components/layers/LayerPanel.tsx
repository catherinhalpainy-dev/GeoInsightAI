import {
  useMemo,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Circle,
  Download,
  LocateFixed,
  Palette,
  Pentagon,
  Route,
  Shapes,
  Trash2,
} from "lucide-react";

import { useAppContext } from "../../app/AppProvider";
import {
  LAND_USE_COLORS,
  LAND_USE_LABELS,
  LAND_USE_TYPES,
} from "../../constants/landUse";
import type {
  AnalysisResultLayer,
} from "../../types/analysis";
import type {
  LayerStyle,
} from "../../types/layerStyle";
import type {
  OverlayLayerStyle,
  VectorGeometryKind,
  WorkspaceVectorLayer,
} from "../../types/mapLayer";
import {
  calculateLandUseStatistics,
} from "../../utils/landUseStatistics";

import "../../styles/layerpanel.css";

interface LayerPanelProps {
  layerStyle: LayerStyle;
  overlayLayers: WorkspaceVectorLayer[];
  analysisResultLayers: AnalysisResultLayer[];
  onLayerStyleChange: (
    next: LayerStyle,
  ) => void;
  onOverlayVisibilityChange: (
    layerId: string,
    visible: boolean,
  ) => void;
  onOverlayOpacityChange: (
    layerId: string,
    opacity: number,
  ) => void;
  onOverlayStyleChange: (
    layerId: string,
    style: Partial<OverlayLayerStyle>,
  ) => void;
  onMoveOverlayLayerUp: (
    layerId: string,
  ) => void;
  onMoveOverlayLayerDown: (
    layerId: string,
  ) => void;
  onFitOverlayLayer: (
    layerId: string,
  ) => void;
  onExportOverlayLayer: (
    layerId: string,
  ) => void;
  onRemoveOverlayLayer: (
    layerId: string,
  ) => void;
  onAnalysisLayerVisibilityChange: (
    layerId: string,
    visible: boolean,
  ) => void;
  onDeleteAnalysisLayer: (
    layerId: string,
  ) => void;
  onExportAnalysisLayer: (
    layerId: string,
  ) => void;
  onClose: () => void;
  onOpenStyle: () => void;
}

const GEOMETRY_LABELS: Record<
  VectorGeometryKind,
  string
> = {
  point: "Point",
  line: "Line",
  polygon: "Polygon",
  mixed: "Mixed",
};

function GeometryIcon({
  kind,
}: {
  kind: VectorGeometryKind;
}) {
  const iconProps = {
    size: 14,
    strokeWidth: 1.8,
    "aria-hidden": true,
  } as const;

  switch (kind) {
    case "point":
      return <Circle {...iconProps} />;

    case "line":
      return <Route {...iconProps} />;

    case "polygon":
      return <Pentagon {...iconProps} />;

    case "mixed":
      return <Shapes {...iconProps} />;
  }
}

export function LayerPanel({
  layerStyle,
  overlayLayers,
  analysisResultLayers,
  onLayerStyleChange,
  onOverlayVisibilityChange,
  onOverlayOpacityChange,
  onOverlayStyleChange,
  onMoveOverlayLayerUp,
  onMoveOverlayLayerDown,
  onFitOverlayLayer,
  onExportOverlayLayer,
  onRemoveOverlayLayer,
  onAnalysisLayerVisibilityChange,
  onDeleteAnalysisLayer,
  onExportAnalysisLayer,
  onClose,
  onOpenStyle,
}: LayerPanelProps) {
  const {
    state,
    filteredFeatures,
  } = useAppContext();
  const [expandedOverlayId, setExpandedOverlayId] =
    useState<string | null>(null);

  const statistics = useMemo(
    () => calculateLandUseStatistics(
      filteredFeatures,
    ),
    [filteredFeatures],
  );
  const totalFeatureCount =
    state.dataset?.collection.features.length ?? 0;

  return (
    <aside className="layer-panel">
      <header className="layer-panel-header">
        <div>
          <span>LAYER TREE</span>
          <h2>图层</h2>
          <p>
            {1 + overlayLayers.length} 个数据图层
            {" · "}
            {analysisResultLayers.length} 个分析结果
          </p>
        </div>
        <button
          type="button"
          aria-label="关闭图层面板"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <section className="layer-section data-layers-section">
        <header className="layer-tree-section-header">
          <div>
            <span>DATA LAYERS</span>
            <h3>数据图层</h3>
          </div>
          <strong>{1 + overlayLayers.length}</strong>
        </header>

        <ul className="workspace-layer-tree">
          <li className="workspace-layer-row primary-layer-row">
            <div className="workspace-layer-main">
              <label>
                <input
                  type="checkbox"
                  checked={layerStyle.layerVisible}
                  aria-label="显示或隐藏土地利用数据"
                  onChange={(event) => {
                    onLayerStyleChange({
                      ...layerStyle,
                      layerVisible:
                        event.currentTarget.checked,
                    });
                  }}
                />
                <span className="workspace-layer-geometry primary">
                  <Pentagon
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
                <span className="workspace-layer-copy">
                  <strong>土地利用数据</strong>
                  <small>
                    主数据
                    {" · "}
                    {filteredFeatures.length.toLocaleString("zh-CN")}
                    {" / "}
                    {totalFeatureCount.toLocaleString("zh-CN")}
                    {" features"}
                  </small>
                </span>
              </label>
              <button
                type="button"
                className="workspace-layer-style-shortcut"
                title="编辑主数据专题样式"
                aria-label="编辑土地利用数据样式"
                onClick={onOpenStyle}
              >
                <Palette size={13} aria-hidden="true" />
              </button>
            </div>
          </li>

          {overlayLayers.map((layer, index) => {
            const showFill =
              layer.geometryKind === "polygon" ||
              layer.geometryKind === "mixed";
            const showLine =
              layer.geometryKind === "line" ||
              layer.geometryKind === "polygon" ||
              layer.geometryKind === "mixed";
            const showPoint =
              layer.geometryKind === "point" ||
              layer.geometryKind === "mixed";
            const styleExpanded =
              expandedOverlayId === layer.id;

            return (
              <li
                key={layer.id}
                className="workspace-layer-row overlay-layer-row"
              >
                <div className="workspace-layer-main">
                  <label>
                    <input
                      type="checkbox"
                      checked={layer.style.visible}
                      aria-label={`显示或隐藏 ${layer.name}`}
                      onChange={(event) => {
                        onOverlayVisibilityChange(
                          layer.id,
                          event.currentTarget.checked,
                        );
                      }}
                    />
                    <span
                      className={`workspace-layer-geometry ${layer.geometryKind}`}
                      style={{
                        color:
                          layer.geometryKind === "point"
                            ? layer.style.pointColor
                            : layer.style.lineColor,
                      }}
                    >
                      <GeometryIcon kind={layer.geometryKind} />
                    </span>
                    <span className="workspace-layer-copy">
                      <strong title={layer.name}>
                        {layer.name}
                      </strong>
                      <small>
                        {GEOMETRY_LABELS[layer.geometryKind]}
                        {" · "}
                        {layer.featureCount.toLocaleString("zh-CN")}
                        {" features"}
                      </small>
                    </span>
                  </label>
                </div>

                <div className="overlay-layer-actions">
                  <button
                    type="button"
                    disabled={index === 0}
                    title="上移图层"
                    aria-label={`上移 ${layer.name}`}
                    onClick={() => {
                      onMoveOverlayLayerUp(layer.id);
                    }}
                  >
                    <ArrowUp size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={index === overlayLayers.length - 1}
                    title="下移图层"
                    aria-label={`下移 ${layer.name}`}
                    onClick={() => {
                      onMoveOverlayLayerDown(layer.id);
                    }}
                  >
                    <ArrowDown size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    title="定位到图层"
                    aria-label={`定位到 ${layer.name}`}
                    onClick={() => {
                      onFitOverlayLayer(layer.id);
                    }}
                  >
                    <LocateFixed size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styleExpanded ? "is-active" : undefined}
                    title="基础样式"
                    aria-label={`编辑 ${layer.name} 样式`}
                    aria-expanded={styleExpanded}
                    onClick={() => {
                      setExpandedOverlayId(
                        styleExpanded ? null : layer.id,
                      );
                    }}
                  >
                    <Palette size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    title="导出 GeoJSON"
                    aria-label={`导出 ${layer.name}`}
                    onClick={() => {
                      onExportOverlayLayer(layer.id);
                    }}
                  >
                    <Download size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    title="删除图层"
                    aria-label={`删除 ${layer.name}`}
                    onClick={() => {
                      onRemoveOverlayLayer(layer.id);
                    }}
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </button>
                </div>

                {styleExpanded && (
                  <div className="overlay-style-editor">
                    <label className="overlay-opacity-control">
                      <span>透明度</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={layer.style.opacity}
                        onChange={(event) => {
                          onOverlayOpacityChange(
                            layer.id,
                            Number(event.currentTarget.value),
                          );
                        }}
                      />
                      <strong>
                        {Math.round(layer.style.opacity * 100)}%
                      </strong>
                    </label>

                    <div className="overlay-symbol-controls">
                      {showFill && (
                        <label>
                          <span>填充</span>
                          <input
                            type="color"
                            value={layer.style.fillColor}
                            onChange={(event) => {
                              onOverlayStyleChange(
                                layer.id,
                                {
                                  fillColor:
                                    event.currentTarget.value,
                                },
                              );
                            }}
                          />
                        </label>
                      )}

                      {showLine && (
                        <label>
                          <span>线色</span>
                          <input
                            type="color"
                            value={layer.style.lineColor}
                            onChange={(event) => {
                              onOverlayStyleChange(
                                layer.id,
                                {
                                  lineColor:
                                    event.currentTarget.value,
                                },
                              );
                            }}
                          />
                        </label>
                      )}

                      {showPoint && (
                        <label>
                          <span>点色</span>
                          <input
                            type="color"
                            value={layer.style.pointColor}
                            onChange={(event) => {
                              onOverlayStyleChange(
                                layer.id,
                                {
                                  pointColor:
                                    event.currentTarget.value,
                                },
                              );
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {showLine && (
                      <label className="overlay-opacity-control">
                        <span>线宽</span>
                        <input
                          type="range"
                          min="0.5"
                          max="8"
                          step="0.5"
                          value={layer.style.lineWidth}
                          onChange={(event) => {
                            onOverlayStyleChange(
                              layer.id,
                              {
                                lineWidth: Number(
                                  event.currentTarget.value,
                                ),
                              },
                            );
                          }}
                        />
                        <strong>{layer.style.lineWidth}px</strong>
                      </label>
                    )}

                    {showPoint && (
                      <label className="overlay-opacity-control">
                        <span>点大小</span>
                        <input
                          type="range"
                          min="2"
                          max="12"
                          step="0.5"
                          value={layer.style.pointRadius}
                          onChange={(event) => {
                            onOverlayStyleChange(
                              layer.id,
                              {
                                pointRadius: Number(
                                  event.currentTarget.value,
                                ),
                              },
                            );
                          }}
                        />
                        <strong>{layer.style.pointRadius}px</strong>
                      </label>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {overlayLayers.length === 0 && (
          <p className="overlay-layers-empty">
            使用左侧“添加图层”追加 Point、Line 或 Polygon GeoJSON。
          </p>
        )}
      </section>

      <details className="layer-section primary-symbol-overview">
        <summary>主数据符号概览</summary>
        <ul className="layer-legend">
          {layerStyle.symbologyMode === "single" && (
            <li>
              <span
                className="layer-legend-color"
                style={{
                  background: layerStyle.fillColor,
                }}
              />
              <span className="layer-legend-name">
                土地利用地块
              </span>
              <strong>{filteredFeatures.length}</strong>
            </li>
          )}

          {layerStyle.symbologyMode === "categorized" &&
            LAND_USE_TYPES.map((type) => (
              <li key={type}>
                <span
                  className="layer-legend-color"
                  style={{
                    background: LAND_USE_COLORS[type],
                  }}
                />
                <span className="layer-legend-name">
                  {LAND_USE_LABELS[type]}
                </span>
                <strong>
                  {statistics.countsByType[type]}
                </strong>
              </li>
            ))}

          {layerStyle.symbologyMode === "graduated" &&
            layerStyle.graduatedClasses.map((item, index) => (
              <li key={`${item.min}-${item.max}-${index}`}>
                <span
                  className="layer-legend-color"
                  style={{ background: item.color }}
                />
                <span className="layer-legend-name">
                  {item.label}
                </span>
              </li>
            ))}
        </ul>
      </details>

      <section className="layer-section analysis-layers-section">
        <header className="analysis-layers-header">
          <div>
            <span>ANALYSIS RESULTS</span>
            <h3>分析结果图层</h3>
          </div>
          <strong>{analysisResultLayers.length}</strong>
        </header>

        {analysisResultLayers.length === 0 ? (
          <p className="analysis-layers-empty">
            地理处理结果会作为独立图层显示在这里。
          </p>
        ) : (
          <ul className="analysis-layer-list">
            {analysisResultLayers.map((layer) => (
              <li key={layer.id}>
                <div className="analysis-layer-main">
                  <label>
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      aria-label={`${layer.visible ? "隐藏" : "显示"}${layer.name}`}
                      onChange={(event) => {
                        onAnalysisLayerVisibilityChange(
                          layer.id,
                          event.currentTarget.checked,
                        );
                      }}
                    />
                    <span
                      className={`analysis-layer-symbol ${layer.operation}`}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{layer.name}</strong>
                      <small>
                        {layer.geometryType}
                        {" · "}
                        {layer.featureCount.toLocaleString("zh-CN")}
                        {" features"}
                      </small>
                    </span>
                  </label>
                </div>

                <div className="analysis-layer-actions">
                  <button
                    type="button"
                    aria-label={`导出 ${layer.name}`}
                    title="导出 GeoJSON"
                    onClick={() => {
                      onExportAnalysisLayer(layer.id);
                    }}
                  >
                    <Download size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`删除 ${layer.name}`}
                    title="删除结果图层"
                    onClick={() => {
                      onDeleteAnalysisLayer(layer.id);
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
