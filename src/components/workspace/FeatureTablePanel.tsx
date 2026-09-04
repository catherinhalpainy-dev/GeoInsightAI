import {
    Download,
    LocateFixed,
    PencilLine,
    Redo2,
    Undo2,
    X,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { LAND_USE_LABELS } from "../../constants/landUse";
import type { LandUseFeature } from "../../types/landUse";

interface FeatureTablePanelProps {
    features: LandUseFeature[];
    selectedFeatureId?: string | null;
    selectedFeatureIds: string[];
    editMessage: string | null;
    canUndo: boolean;
    canRedo: boolean;
    onFeatureSelect: (feature: LandUseFeature) => void;
    onToggleSelection: (featureId: string) => void;
    onSelectAll: () => void;
    onInvertSelection: () => void;
    onClearSelection: () => void;
    onBatchEdit: () => void;
    onFitSelection: () => void;
    onExportSelectionGeoJson: () => void;
    onExportSelectionCsv: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onClose: () => void;
    onExport: () => void;
}

export function FeatureTablePanel({
    features,
    selectedFeatureId = null,
    selectedFeatureIds,
    editMessage,
    canUndo,
    canRedo,
    onFeatureSelect,
    onToggleSelection,
    onSelectAll,
    onInvertSelection,
    onClearSelection,
    onBatchEdit,
    onFitSelection,
    onExportSelectionGeoJson,
    onExportSelectionCsv,
    onUndo,
    onRedo,
    onClose,
    onExport,
}: FeatureTablePanelProps) {
    const selectedRowRef = useRef<HTMLTableRowElement | null>(null);
    const selectionSet = useMemo(
        () => new Set(selectedFeatureIds),
        [selectedFeatureIds],
    );
    const visibleSelectionCount = features.reduce(
        (count, feature) => count + Number(selectionSet.has(feature.properties.id)),
        0,
    );
    const hasSelection = selectedFeatureIds.length > 0;

    useEffect(() => {
        selectedRowRef.current?.scrollIntoView({
            block: "nearest",
            behavior: "smooth",
        });
    }, [selectedFeatureId]);

    return (
        <aside className="feature-table-panel">
            <header className="feature-table-header">
                <div>
                    <span>ATTRIBUTE TABLE</span>
                    <h2>属性表</h2>
                </div>
                <button type="button" aria-label="关闭属性表" onClick={onClose}>
                    <X size={17} />
                </button>
            </header>

            <div className="feature-table-toolbar table-result-toolbar">
                <span>当前结果 {features.length} 条</span>
                <button type="button" disabled={features.length === 0} onClick={onExport}>
                    导出结果
                </button>
            </div>

            <div className="selection-toolbar">
                <div className="selection-count">
                    <strong>已选择 {selectedFeatureIds.length}</strong>
                    <span>当前可见 {visibleSelectionCount}</span>
                </div>
                <div className="selection-compact-actions">
                    <button type="button" disabled={features.length === 0} onClick={onSelectAll}>全选</button>
                    <button type="button" disabled={features.length === 0} onClick={onInvertSelection}>反选</button>
                    <button type="button" disabled={!hasSelection} onClick={onClearSelection}>清除</button>
                </div>
                <div className="selection-primary-actions">
                    <button type="button" disabled={!hasSelection} onClick={onBatchEdit}>
                        <PencilLine size={13} />批量编辑
                    </button>
                    <button type="button" disabled={!hasSelection} onClick={onFitSelection}>
                        <LocateFixed size={13} />定位
                    </button>
                </div>
                <div className="selection-export-actions">
                    <button type="button" disabled={!hasSelection} onClick={onExportSelectionGeoJson}>
                        <Download size={12} />GeoJSON
                    </button>
                    <button type="button" disabled={!hasSelection} onClick={onExportSelectionCsv}>
                        <Download size={12} />CSV
                    </button>
                    <button type="button" disabled={!canUndo} onClick={onUndo} title="撤销编辑">
                        <Undo2 size={13} />
                    </button>
                    <button type="button" disabled={!canRedo} onClick={onRedo} title="重做编辑">
                        <Redo2 size={13} />
                    </button>
                </div>
                {editMessage && <p className="selection-edit-message">{editMessage}</p>}
            </div>

            <div className="feature-table-scroll">
                <div className="feature-table-container">
                    <table className="feature-table selection-feature-table">
                        <thead>
                            <tr>
                                <th aria-label="选择" />
                                <th>ID</th>
                                <th>用地类型</th>
                                <th>面积</th>
                                <th>行政区</th>
                                <th>建成年份</th>
                            </tr>
                        </thead>
                        <tbody>
                            {features.map((feature) => {
                                const properties = feature.properties;
                                const active = properties.id === selectedFeatureId;
                                const selected = selectionSet.has(properties.id);

                                return (
                                    <tr
                                        key={properties.id}
                                        ref={active ? selectedRowRef : undefined}
                                        className={`${active ? "is-selected" : ""}${selected ? " is-in-selection" : ""}`}
                                        onClick={() => onFeatureSelect(feature)}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selected}
                                                aria-label={`选择 ${properties.id}`}
                                                onClick={(event) => event.stopPropagation()}
                                                onChange={() => onToggleSelection(properties.id)}
                                            />
                                        </td>
                                        <td>{properties.id}</td>
                                        <td>{LAND_USE_LABELS[properties.landUseType]}</td>
                                        <td>{properties.areaM2.toLocaleString()} m²</td>
                                        <td>{properties.districtCode}</td>
                                        <td>{properties.builtYear ?? "未知"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </aside>
    );
}
