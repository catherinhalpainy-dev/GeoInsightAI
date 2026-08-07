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
}

export function WorkspaceToolbar({
  activeTool,
  activePanel,
  onToolChange,
  onPanelToggle,
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

      <div className="workspace-tool-divider" />

      <button
        type="button"
        className={
          activePanel==="layers"
          ? "workspace-tool active"
          : "workspace-tool"
        }
        onClick={()=>{
          onPanelToggle("layers");
        }}
      >
        ◫
        <span>图层</span>
      </button>

      <button
        type="button"
        className={
          activePanel==="filter"
            ? "workspace-tool active"
            : "workspace-tool"
        }
        onClick={()=>{onPanelToggle("filter")}}
        
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