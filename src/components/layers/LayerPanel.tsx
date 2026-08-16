import { useMemo } from "react";
import type { LayerStyle } from "../../types/layerStyle";
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


  onLayerStyleChange: (
    next: LayerStyle,
  ) => void;

  onMoveUp: () => void;
  onMoveDown: () => void;
  onClose: () => void;
  onOpenStyle:()=>void;


}

export function LayerPanel({
  layerStyle,
  onLayerStyleChange,
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
        <h3>分类图例</h3>

        <ul className="layer-legend">
          {LAND_USE_TYPES.map((type) => (
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
        </ul>
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