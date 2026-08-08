import { useMemo } from "react";

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

interface LayerPanelProps {
  layerVisible: boolean;

  onLayerVisibleChange: (
    visible: boolean,
  ) => void;

  // onOpenStyle必须是一个函数，不接收参数，也不需要返回业务值
  onOpenStyle:()=>void;
}

export function LayerPanel({
  layerVisible,
  onLayerVisibleChange,
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
      </header>

      <section className="layer-section">
        <div className="layer-row">
          <label>
            {/* 受控组件 */}
            <input
              type="checkbox"
              checked={layerVisible}
              onChange={(event) => {
                onLayerVisibleChange(
                  event.currentTarget.checked,
                );
              }}
            />

            <span>
              城市用地分类面
            </span>
          </label>

          <span
            className={
              layerVisible
                ? "layer-status visible"
                : "layer-status hidden"
            }
          >
            {layerVisible
              ? "显示"
              : "隐藏"}
          </span>
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
    </aside>
  );
}