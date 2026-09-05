import {
    Check,
    Pencil,
    Plus,
    Redo2,
    Trash2,
    Undo2,
    X,
} from "lucide-react";
import {
    useEffect,
    useState,
} from "react";

import {
    LAND_USE_LABELS,
    LAND_USE_TYPES,
} from "../../constants/landUse";
import type {
    GeometryEditorMode,
    NewLandUseProperties,
} from "../../types/geometryEditing";
import type {
    LandUseFeature,
    LandUseType,
} from "../../types/landUse";

interface GeometryEditPanelProps {
    mode: GeometryEditorMode;
    selectedFeature: LandUseFeature | null;
    editingFeatureId: string | null;
    pendingFeatureId: string | null;
    vertexCount: number;
    activeVertexIndex: number | null;
    snappingEnabled: boolean;
    draftAreaM2: number | null;
    validationError: string | null;
    deleteConfirmationOpen: boolean;
    abandonConfirmationOpen: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onStartCreate: () => void;
    onStartEdit: (feature: LandUseFeature) => void;
    onCompleteCreate: (properties: NewLandUseProperties) => void;
    onSaveEdit: () => void;
    onDeleteActiveVertex: () => void;
    onToggleSnapping: () => void;
    onRequestDelete: () => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
    onCancelDraft: () => void;
    onRequestAbandon: () => void;
    onCancelAbandon: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onClose: () => void;
}

export function GeometryEditPanel({
    mode,
    selectedFeature,
    editingFeatureId,
    pendingFeatureId,
    vertexCount,
    activeVertexIndex,
    snappingEnabled,
    draftAreaM2,
    validationError,
    deleteConfirmationOpen,
    abandonConfirmationOpen,
    canUndo,
    canRedo,
    onStartCreate,
    onStartEdit,
    onCompleteCreate,
    onSaveEdit,
    onDeleteActiveVertex,
    onToggleSnapping,
    onRequestDelete,
    onCancelDelete,
    onConfirmDelete,
    onCancelDraft,
    onRequestAbandon,
    onCancelAbandon,
    onUndo,
    onRedo,
    onClose,
}: GeometryEditPanelProps) {
    const [landUseType, setLandUseType] =
        useState<LandUseType>("residential");
    const [builtYear, setBuiltYear] = useState("");
    const [districtCode, setDistrictCode] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (mode !== "creating") {
            return;
        }

        setLandUseType("residential");
        setBuiltYear("");
        setDistrictCode(selectedFeature?.properties.districtCode ?? "");
        setFormError(null);
    }, [mode, pendingFeatureId, selectedFeature]);

    function requestCloseOrCancel() {
        if (mode === "idle") {
            onClose();
            return;
        }

        onRequestAbandon();
    }

    function submitNewFeature() {
        const normalizedDistrictCode = districtCode.trim();

        if (!normalizedDistrictCode) {
            setFormError("请输入行政区代码。");
            return;
        }

        let normalizedBuiltYear: number | null = null;

        if (builtYear.trim() !== "") {
            const value = Number(builtYear);

            if (!Number.isInteger(value) || value < 0) {
                setFormError("请输入有效的建成年份，或留空表示未知。");
                return;
            }

            normalizedBuiltYear = value;
        }

        setFormError(null);
        onCompleteCreate({
            landUseType,
            builtYear: normalizedBuiltYear,
            districtCode: normalizedDistrictCode,
        });
    }

    const currentFeature = selectedFeature;
    const currentFeatureEditable = currentFeature
        ? currentFeature.geometry.coordinates.length === 1
        : false;

    return (
        <aside className="geometry-edit-panel">
            <header className="geometry-edit-header">
                <div>
                    <span>GEOMETRY EDIT</span>
                    <h2>几何编辑</h2>
                </div>
                <button
                    type="button"
                    aria-label="关闭几何编辑"
                    onClick={requestCloseOrCancel}
                >
                    <X size={17} />
                </button>
            </header>

            {mode === "idle" && (
                <>
                    <section className="geometry-edit-section">
                        <span className="geometry-edit-eyebrow">CREATE</span>
                        <h3>新建 Polygon 地块</h3>
                        <p>在地图上单击添加顶点，双击完成范围。</p>
                        <button
                            type="button"
                            className="geometry-edit-primary"
                            onClick={onStartCreate}
                        >
                            <Plus size={15} />新建地块
                        </button>
                    </section>

                    <section className="geometry-edit-section">
                        <span className="geometry-edit-eyebrow">CURRENT FEATURE</span>
                        {currentFeature ? (
                            <>
                                <div className="geometry-current-feature">
                                    <strong>{currentFeature.properties.id}</strong>
                                    <span>Polygon · {currentFeature.geometry.coordinates[0]?.length - 1} 顶点</span>
                                </div>
                                <div className="geometry-edit-row-actions">
                                    <button
                                        type="button"
                                        disabled={!currentFeatureEditable}
                                        onClick={() => onStartEdit(currentFeature)}
                                    >
                                        <Pencil size={14} />编辑几何
                                    </button>
                                    <button
                                        type="button"
                                        className="geometry-delete-action"
                                        onClick={onRequestDelete}
                                    >
                                        <Trash2 size={14} />删除地块
                                    </button>
                                </div>
                                {!currentFeatureEditable && (
                                    <p>当前版本暂不支持含内环的 Polygon 几何编辑。</p>
                                )}
                            </>
                        ) : (
                            <p>请先在地图或属性表中选择一个地块。</p>
                        )}
                    </section>
                </>
            )}

            {mode === "drawing" && (
                <section className="geometry-edit-section geometry-edit-progress">
                    <span className="geometry-edit-eyebrow">DRAWING</span>
                    <h3>正在绘制</h3>
                    <p>单击添加顶点，双击完成。至少需要 3 个不同顶点。</p>
                    <dl>
                        <div><dt>顶点</dt><dd>{vertexCount}</dd></div>
                    </dl>
                    <label className="geometry-snap-toggle">
                        <input
                            type="checkbox"
                            checked={snappingEnabled}
                            onChange={onToggleSnapping}
                        />
                        顶点捕捉（10 px）
                    </label>
                    {validationError && <p className="geometry-edit-error">{validationError}</p>}
                    <button type="button" className="geometry-edit-ghost" onClick={requestCloseOrCancel}>
                        取消绘制
                    </button>
                </section>
            )}

            {mode === "creating" && (
                <section className="geometry-edit-section">
                    <span className="geometry-edit-eyebrow">NEW FEATURE</span>
                    <h3>新地块属性</h3>
                    <dl className="geometry-draft-metrics">
                        <div><dt>ID</dt><dd>{pendingFeatureId}</dd></div>
                        <div><dt>面积</dt><dd>{draftAreaM2?.toLocaleString("zh-CN", { maximumFractionDigits: 0 }) ?? "—"} m²</dd></div>
                    </dl>
                    <label className="geometry-edit-field">
                        <span>用地类型</span>
                        <select value={landUseType} onChange={(event) => setLandUseType(event.target.value as LandUseType)}>
                            {LAND_USE_TYPES.map((type) => (
                                <option key={type} value={type}>{LAND_USE_LABELS[type]}</option>
                            ))}
                        </select>
                    </label>
                    <label className="geometry-edit-field">
                        <span>建成年份</span>
                        <input type="number" value={builtYear} placeholder="可选" onChange={(event) => setBuiltYear(event.target.value)} />
                    </label>
                    <label className="geometry-edit-field">
                        <span>行政区代码</span>
                        <input type="text" value={districtCode} onChange={(event) => setDistrictCode(event.target.value)} />
                    </label>
                    {(formError || validationError) && (
                        <p className="geometry-edit-error">{formError ?? validationError}</p>
                    )}
                    <div className="geometry-edit-submit-row">
                        <button type="button" onClick={requestCloseOrCancel}>取消</button>
                        <button type="button" onClick={submitNewFeature}>
                            <Check size={14} />创建地块
                        </button>
                    </div>
                </section>
            )}

            {mode === "editing" && (
                <section className="geometry-edit-section geometry-edit-progress">
                    <span className="geometry-edit-eyebrow">EDITING</span>
                    <h3>正在编辑</h3>
                    <p>{editingFeatureId}</p>
                    <dl>
                        <div><dt>顶点</dt><dd>{vertexCount}</dd></div>
                        <div><dt>当前顶点</dt><dd>{activeVertexIndex === null ? "—" : activeVertexIndex + 1}</dd></div>
                        <div><dt>新面积</dt><dd>{draftAreaM2?.toLocaleString("zh-CN", { maximumFractionDigits: 0 }) ?? "—"} m²</dd></div>
                    </dl>
                    <label className="geometry-snap-toggle">
                        <input type="checkbox" checked={snappingEnabled} onChange={onToggleSnapping} />
                        顶点捕捉（10 px）
                    </label>
                    <button
                        type="button"
                        className="geometry-edit-ghost"
                        disabled={activeVertexIndex === null || vertexCount <= 3}
                        onClick={onDeleteActiveVertex}
                    >
                        <Trash2 size={13} />删除当前顶点
                    </button>
                    {validationError && <p className="geometry-edit-error">{validationError}</p>}
                    <div className="geometry-edit-submit-row">
                        <button type="button" onClick={requestCloseOrCancel}>取消</button>
                        <button type="button" onClick={onSaveEdit}>
                            <Check size={14} />保存修改
                        </button>
                    </div>
                </section>
            )}

            <section className="geometry-edit-section geometry-history-actions">
                <span className="geometry-edit-eyebrow">EDIT HISTORY</span>
                <div>
                    <button type="button" disabled={!canUndo || mode !== "idle"} onClick={onUndo}>
                        <Undo2 size={14} />撤销
                    </button>
                    <button type="button" disabled={!canRedo || mode !== "idle"} onClick={onRedo}>
                        <Redo2 size={14} />重做
                    </button>
                </div>
            </section>

            {deleteConfirmationOpen && currentFeature && (
                <div className="geometry-delete-confirmation" role="alertdialog" aria-modal="true">
                    <strong>删除地块</strong>
                    <p>确定删除当前地块？</p>
                    <code>{currentFeature.properties.id}</code>
                    <span>此操作可通过 Undo 恢复。</span>
                    <div>
                        <button type="button" onClick={onCancelDelete}>取消</button>
                        <button type="button" onClick={onConfirmDelete}>确认删除</button>
                    </div>
                </div>
            )}

            {abandonConfirmationOpen && (
                <div className="geometry-delete-confirmation" role="alertdialog" aria-modal="true">
                    <strong>放弃未保存修改？</strong>
                    <p>当前几何草稿尚未提交，放弃后无法恢复。</p>
                    <div>
                        <button type="button" onClick={onCancelAbandon}>继续编辑</button>
                        <button
                            type="button"
                            onClick={onCancelDraft}
                        >放弃修改</button>
                    </div>
                </div>
            )}
        </aside>
    );
}
