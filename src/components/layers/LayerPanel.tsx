import { useMemo } from "react";
import {
  Download,
  Trash2,
} from "lucide-react";
import type { LayerStyle } from "../../types/layerStyle";
import type {
  AnalysisResultLayer,
} from "../../types/analysis";
import { useAppContext }
  from "../../app/AppProvider";

import {
  LAND_USE_COLORS,
  LAND_USE_LABELS,
  LAND_USE_TYPES,
} from "../../constants/landUse";

import {
  calculateLandUseStatistics,
} from "../../utils/landUseStatistics";

import "../../styles/layerpanel.css"

interface LayerPanelProps {
  layerStyle: LayerStyle;
  analysisResultLayers:
    AnalysisResultLayer[];


  onLayerStyleChange: (
    next: LayerStyle,
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

  onMoveUp: () => void;
  onMoveDown: () => void;
  onClose: () => void;
  onOpenStyle:()=>void;


}

export function LayerPanel({
  layerStyle,
  analysisResultLayers,
  onLayerStyleChange,
  onAnalysisLayerVisibilityChange,
  onDeleteAnalysisLayer,
  onExportAnalysisLayer,
  onMoveUp,
  onMoveDown,
  onClose,
  onOpenStyle,
}: LayerPanelProps) {
  const {
    state,
    filteredFeatures,
  } = useAppContext();

  const statistics =
    useMemo(() => {
      return calculateLandUseStatistics(
        filteredFeatures,
      );
    }, [filteredFeatures]);

  const totalFeatureCount =
    state.dataset?.collection.features
      .length ?? 0;

  return (
    <aside className="layer-panel">
      <header className="layer-panel-header">
        <div>
          <h2>图层</h2>

          <p>
            当前 {filteredFeatures.length}
            {" / "}
            {totalFeatureCount} 条要素
          </p>

          <button
            type="button"
            onClick={onOpenStyle}>编辑样式</button>

        </div>
        <button type="button"
        aria-label="关闭图层面板"
        onClick={onClose}>×</button>
      </header>

      <section className="layer-section">
        <label className="layer-control-row">
          <span>
            图层显示
          </span>

          <input
            type="checkbox"

            checked={
              layerStyle.layerVisible
            }

            onChange={
              (event) =>
                onLayerStyleChange({
                  ...layerStyle,

                  layerVisible:
                    event.target
                      .checked,
                })
            }
          />
        </label>
        <label className="layer-control-row">
          <span>
            填充显示
          </span>

          <input
            type="checkbox"

            checked={
              layerStyle.fillVisible
            }

            disabled={
              !layerStyle.layerVisible
            }

            onChange={
              (event) =>
                onLayerStyleChange({
                  ...layerStyle,

                  fillVisible:
                    event.target
                      .checked,
                })
            }
          />
        </label>
        <div className="layer-slider-row">
          <div>
            <span>
              填充透明度
            </span>

            <strong>
              {
                Math.round(
                  layerStyle.fillOpacity *
                  100,
                )
              }%
            </strong>
          </div>

          <input
            type="range"

            min="0"
            max="1"
            step="0.05"

            value={
              layerStyle.fillOpacity
            }

            disabled={
              !layerStyle.layerVisible ||
              !layerStyle.fillVisible
            }

            onChange={
              (event) =>
                onLayerStyleChange({
                  ...layerStyle,

                  fillOpacity:
                    Number(
                      event.target
                        .value,
                    ),
                })
            }
          />
        </div>
        <label className="layer-control-row">
          <span>
            边界显示
          </span>

          <input
            type="checkbox"

            checked={
              layerStyle.outlineVisible
            }

            disabled={
              !layerStyle.layerVisible
            }

            onChange={
              (event) =>
                onLayerStyleChange({
                  ...layerStyle,

                  outlineVisible:
                    event.target
                      .checked,
                })
            }
          />
        </label>
        <div className="layer-slider-row">
          <div>
            <span>
              边界透明度
            </span>

            <strong>
              {
                Math.round(
                  layerStyle.outlineOpacity *
                  100,
                )
              }%
            </strong>
          </div>

          <input
            type="range"

            min="0"
            max="1"
            step="0.05"

            value={
              layerStyle.outlineOpacity
            }

            disabled={
              !layerStyle.layerVisible ||
              !layerStyle.outlineVisible
            }

            onChange={
              (event) =>
                onLayerStyleChange({
                  ...layerStyle,

                  outlineOpacity:
                    Number(
                      event.target
                        .value,
                    ),
                })
            }
          />
        </div>
        <div className="layer-slider-row">
          <div>
            <span>
              边界宽度
            </span>

            <strong>
              {
                layerStyle.outlineWidth
              }
              px
            </strong>
          </div>

          <input
            type="range"

            min="0"
            max="5"
            step="0.5"

            value={
              layerStyle.outlineWidth
            }

            disabled={
              !layerStyle.layerVisible ||
              !layerStyle.outlineVisible
            }

            onChange={
              (event) =>
                onLayerStyleChange({
                  ...layerStyle,

                  outlineWidth:
                    Number(
                      event.target
                        .value,
                    ),
                })
            }
          />
        </div>

      </section>


      <section className="layer-section">
        <h3>符号概览</h3>

        <ul className="layer-legend">
          {layerStyle.symbologyMode === "single" && (
            <li>
              <span
                className="layer-legend-color"
                style={{
                  background:
                    layerStyle.fillColor,
                }}
              />

              <span className="layer-legend-name">
                土地利用地块
              </span>

              <strong>
                {filteredFeatures.length}
              </strong>
            </li>
          )}

          {layerStyle.symbologyMode === "categorized" &&
            LAND_USE_TYPES.map((type) => (
              <li key={type}>
                <span
                  className="layer-legend-color"
                  style={{
                    background:
                      LAND_USE_COLORS[type],
                  }}
                />

                <span className="layer-legend-name">
                  {LAND_USE_LABELS[type]}
                </span>

                <strong>
                  {
                    statistics
                      .countsByType[type]
                  }
                </strong>
              </li>
            ))}

          {layerStyle.symbologyMode === "graduated" &&
            layerStyle.graduatedClasses.map((item, index) => (
              <li
                key={`${item.min}-${item.max}-${index}`}
              >
                <span
                  className="layer-legend-color"
                  style={{
                    background: item.color,
                  }}
                />

                <span className="layer-legend-name">
                  {item.label}
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section className="layer-section analysis-layers-section">
        <header className="analysis-layers-header">
          <div>
            <span>ANALYSIS RESULTS</span>
            <h3>分析结果图层</h3>
          </div>
          <strong>
            {analysisResultLayers.length}
          </strong>
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

      <div className="layer-order-actions">
        <button
          type="button"

          onClick={
            onMoveUp
          }
        >
          ↑ 上移
        </button>


        <button
          type="button"

          onClick={
            onMoveDown
          }
        >
          ↓ 下移
        </button>
      </div>
    </aside>
  );
}
