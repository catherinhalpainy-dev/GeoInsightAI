import {
  FilePlus2,
  ShieldCheck,
  SquareDashed,
  Workflow,
} from "lucide-react";
import { useRef } from "react";

import type { WorkspacePanel, WorkspaceTool } from "../../types/workspace";

interface WorkspaceToolbarProps {
  activeTool: WorkspaceTool;
  activePanel: WorkspacePanel;

  onToolChange: (
    tool: WorkspaceTool,
  ) => void;

  // Exclude<A,B>
  // 从联合类型中删除某些成员
  onPanelToggle: (
    panel: Exclude<
      WorkspacePanel,
      null
    >,
  ) => void;

  onFitAll: () => void;
  onFitSelected: () => void
  canFitSelected: boolean;
  measureMode:
  "none"
  |
  "distance"
  |
  "area";


  onMeasureChange:
  (
    mode:
      "none"
      |
      "distance"
      |
      "area"
  ) =>
    void;

  onAddOverlayLayer: (
    file: File,
  ) => void;
  overlayImporting: boolean;
}

export function WorkspaceToolbar({
  activeTool,
  activePanel,
  onToolChange,
  onPanelToggle,
  onFitAll,
  onFitSelected,
  canFitSelected,
  measureMode,
  onMeasureChange,
  onAddOverlayLayer,
  overlayImporting,
}: WorkspaceToolbarProps) {
  const overlayFileInputRef =
    useRef<HTMLInputElement | null>(null);

  return (
    <aside className="workspace-toolbar">
      <button
        type="button"
        className={
          activeTool === "select"
            ? "workspace-tool active"
            : "workspace-tool"
        }
        onClick={() => {
          onToolChange("select");
        }}
      >
        ↖
        <span>选择</span>
      </button>

      <button
        type="button"
        className={
          measureMode === "distance"
            ?
            "workspace-tool active"
            :
            "workspace-tool"
        }
        onClick={() => {

          onMeasureChange(
            "distance"
          )

        }}

      >

        📏

        <span>
          测距
        </span>
      </button>
      <button
        type="button"
        className={
          measureMode === "area"
            ?
            "workspace-tool active"
            :
            "workspace-tool"
        }
        onClick={() => {
          onMeasureChange(
            "area"
          )
        }}
      >
        ⬡
        <span>
          测面积
        </span>
      </button>

      <button
        type="button"
        className={
          activePanel === "aoi-analysis"
            ? "workspace-tool workspace-tool-module active"
            : "workspace-tool workspace-tool-module"
        }
        onClick={() => {
          onPanelToggle("aoi-analysis");
        }}
        title="绘制 AOI 并执行空间查询"
      >
        <SquareDashed size={21} strokeWidth={1.9} aria-hidden="true" />
        <span>范围分析</span>
      </button>

      <button
        type="button"
        className={
          activePanel === "geoprocessing"
            ? "workspace-tool workspace-tool-module active"
            : "workspace-tool workspace-tool-module"
        }
        onClick={() => {
          onPanelToggle("geoprocessing");
        }}
        title="运行叠加、融合与中心点工具"
      >
        <Workflow size={21} strokeWidth={1.9} aria-hidden="true" />
        <span>地理处理</span>
      </button>

      <button
        type="button"
        className="workspace-tool workspace-tool-module"
        disabled={overlayImporting}
        title="向当前地图追加 GeoJSON 图层"
        onClick={() => {
          overlayFileInputRef.current?.click();
        }}
      >
        <FilePlus2 size={21} strokeWidth={1.9} aria-hidden="true" />
        <span>
          {overlayImporting
            ? "导入中"
            : "添加图层"}
        </span>
      </button>
      <input
        ref={overlayFileInputRef}
        className="workspace-overlay-file-input"
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        aria-label="选择追加的 GeoJSON 图层"
        disabled={overlayImporting}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];

          if (file) {
            onAddOverlayLayer(file);
          }

          event.currentTarget.value = "";
        }}
      />

      <button
        type="button"
        className={
          activePanel === "data-quality"
            ? "workspace-tool workspace-tool-module active"
            : "workspace-tool workspace-tool-module"
        }
        onClick={() => {
          onPanelToggle("data-quality");
        }}
        title="检查空间结构、几何与属性质量"
      >
        <ShieldCheck size={21} strokeWidth={1.9} aria-hidden="true" />
        <span>数据质量</span>
      </button>

      <button
        type="button"
        className={
          activeTool === "pan"
            ? "workspace-tool active"
            : "workspace-tool"
        }
        onClick={() => {
          onToolChange("pan");
        }}
      >
        ✋
        <span>平移</span>
      </button>

      <button
        type="button"

        className=
        "workspace-tool"

        onClick={
          onFitAll
        }

        title=
        "缩放至完整数据范围"
      >
        ⛶

        <span>
          全图
        </span>
      </button>


      <button
        type="button"

        className=
        "workspace-tool"

        onClick={
          onFitSelected
        }

        disabled={
          !canFitSelected
        }

        title={
          canFitSelected
            ? "定位当前选中地块"
            : "请先选择一个地块"
        }
      >
        ◎

        <span>
          定位
        </span>
      </button>
      <div className="workspace-tool-divider" />
      <button
        type="button"

        className={
          activePanel ===
            "basemap"
            ? "workspace-tool is-active"
            : "workspace-tool"
        }

        onClick={() =>
          onPanelToggle(
            "basemap",
          )
        }
      >
        ◫

        <span>
          底图
        </span>
      </button>
      <button
        type="button"
        className={
          activePanel === "layers"
            ? "workspace-tool active"
            : "workspace-tool"
        }
        onClick={() => {
          onPanelToggle("layers");
        }}
      >
        ◫
        <span>图层</span>
      </button>
      <button
        type="button"

        className={
          activePanel ===
            "table"
            ? "workspace-tool is-active"
            : "workspace-tool"
        }

        onClick={() => {
          onPanelToggle(
            "table",
          );
        }}

        title="打开属性表"
      >
        ▦

        <span>
          属性表
        </span>
      </button>
      <button
        type="button"
        className={
          activePanel === "filter"
            ? "workspace-tool active"
            : "workspace-tool"
        }
        onClick={() => { onPanelToggle("filter") }}

      >
        ▽
        <span>筛选</span>
      </button>

      <button
        type="button"
        className="workspace-tool"
        disabled
      >
        ⚙
        <span>设置</span>
      </button>
    </aside>
  );
}
