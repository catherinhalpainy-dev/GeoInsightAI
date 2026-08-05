interface WorkspaceToolbarProps {
  filterOpen: boolean;
  onToggleFilter: () => void;
}

export function WorkspaceToolbar({
  filterOpen,
  onToggleFilter,
}: WorkspaceToolbarProps) {
  return (
    <aside className="workspace-toolbar">
      <button
        type="button"
        className="workspace-tool active"
        title="选择"
      >
        ↖
        <span>选择</span>
      </button>

      <button
        type="button"
        className="workspace-tool"
        title="平移"
      >
        ✋
        <span>平移</span>
      </button>

      <div className="workspace-tool-divider" />

      <button
        type="button"
        className="workspace-tool"
        disabled
        title="图层面板将在下一阶段完善"
      >
        ◫
        <span>图层</span>
      </button>

      <button
        type="button"
        className={
          filterOpen
            ? "workspace-tool active"
            : "workspace-tool"
        }
        onClick={onToggleFilter}
        title="属性筛选"
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
        title="设置将在后续实现"
      >
        ⚙
        <span>设置</span>
      </button>
    </aside>
  );
}