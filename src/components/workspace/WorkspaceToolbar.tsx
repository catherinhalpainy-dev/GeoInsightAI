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
}

export function WorkspaceToolbar({
  activeTool,
  activePanel,
  onToolChange,
  onPanelToggle,
  onFitAll,
  onFitSelected,
  canFitSelected,
}: WorkspaceToolbarProps) {
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
        title="空间分析将在后续实现"
      >
        ▥
        <span>分析</span>
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