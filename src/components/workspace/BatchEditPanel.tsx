import {
    Check,
    Redo2,
    Undo2,
    X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
    LAND_USE_LABELS,
    LAND_USE_TYPES,
} from "../../constants/landUse";
import type {
    EditTransaction,
    LandUsePropertyChanges,
} from "../../types/editHistory";
import type {
    LandUseFeature,
    LandUseType,
} from "../../types/landUse";

interface BatchEditPanelProps {
    features: LandUseFeature[];
    history: EditTransaction[];
    canUndo: boolean;
    canRedo: boolean;
    onApply: (changes: LandUsePropertyChanges) => void;
    onUndo: () => void;
    onRedo: () => void;
    onClose: () => void;
}

type EditableField = keyof LandUsePropertyChanges;

const FIELD_LABELS: Record<EditableField, string> = {
    landUseType: "用地类型",
    builtYear: "建成年份",
    districtCode: "行政区代码",
};

export function BatchEditPanel({
    features,
    history,
    canUndo,
    canRedo,
    onApply,
    onUndo,
    onRedo,
    onClose,
}: BatchEditPanelProps) {
    const [enabledFields, setEnabledFields] = useState<EditableField[]>([]);
    const [landUseType, setLandUseType] = useState<LandUseType>("residential");
    const [builtYear, setBuiltYear] = useState("");
    const [districtCode, setDistrictCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingChanges, setPendingChanges] =
        useState<LandUsePropertyChanges | null>(null);

    const sourceSummaries = useMemo(() => {
        const summarize = (values: (string | number | null)[]) => {
            const distinct = new Set(values.map(String));
            return distinct.size === 1 ? String(values[0] ?? "空") : "多个值";
        };

        return {
            landUseType: summarize(features.map(
                (feature) => LAND_USE_LABELS[feature.properties.landUseType],
            )),
            builtYear: summarize(features.map(
                (feature) => feature.properties.builtYear,
            )),
            districtCode: summarize(features.map(
                (feature) => feature.properties.districtCode,
            )),
        };
    }, [features]);

    function toggleField(field: EditableField) {
        setEnabledFields((previous) => previous.includes(field)
            ? previous.filter((item) => item !== field)
            : [...previous, field],
        );
        setError(null);
        setPendingChanges(null);
    }

    function prepareChanges() {
        if (enabledFields.length === 0) {
            setError("请至少启用一个需要修改的字段。");
            return;
        }

        const changes: LandUsePropertyChanges = {};

        if (enabledFields.includes("landUseType")) {
            changes.landUseType = landUseType;
        }

        if (enabledFields.includes("builtYear")) {
            const year = Number(builtYear);

            if (!Number.isInteger(year) || year < 0) {
                setError("请输入有效的建成年份。");
                return;
            }

            changes.builtYear = year;
        }

        if (enabledFields.includes("districtCode")) {
            if (districtCode.trim() === "") {
                setError("请输入行政区代码。");
                return;
            }

            changes.districtCode = districtCode.trim();
        }

        setPendingChanges(changes);
        setError(null);
    }

    return (
        <aside className="batch-edit-panel">
            <header className="batch-edit-header">
                <div>
                    <span>BATCH EDIT</span>
                    <h2>批量属性编辑</h2>
                    <p>当前选择 {features.length} 个地块</p>
                </div>
                <button type="button" onClick={onClose} aria-label="关闭批量编辑">
                    <X size={17} />
                </button>
            </header>

            <section className="batch-edit-section">
                <span className="batch-edit-eyebrow">FIELDS</span>
                <p className="batch-edit-description">
                    只有勾选启用的字段会被写入。业务 ID 与几何面积不可批量修改。
                </p>

                <label className="batch-edit-field">
                    <input
                        type="checkbox"
                        checked={enabledFields.includes("landUseType")}
                        onChange={() => toggleField("landUseType")}
                    />
                    <span>用地类型</span>
                    <select
                        disabled={!enabledFields.includes("landUseType")}
                        value={landUseType}
                        onChange={(event) => setLandUseType(event.target.value as LandUseType)}
                    >
                        {LAND_USE_TYPES.map((type) => (
                            <option key={type} value={type}>{LAND_USE_LABELS[type]}</option>
                        ))}
                    </select>
                </label>

                <label className="batch-edit-field">
                    <input
                        type="checkbox"
                        checked={enabledFields.includes("builtYear")}
                        onChange={() => toggleField("builtYear")}
                    />
                    <span>建成年份</span>
                    <input
                        type="number"
                        disabled={!enabledFields.includes("builtYear")}
                        value={builtYear}
                        placeholder="例如 2020"
                        onChange={(event) => setBuiltYear(event.target.value)}
                    />
                </label>

                <label className="batch-edit-field">
                    <input
                        type="checkbox"
                        checked={enabledFields.includes("districtCode")}
                        onChange={() => toggleField("districtCode")}
                    />
                    <span>行政区代码</span>
                    <input
                        type="text"
                        disabled={!enabledFields.includes("districtCode")}
                        value={districtCode}
                        placeholder="例如 110105"
                        onChange={(event) => setDistrictCode(event.target.value)}
                    />
                </label>

                {error && <p className="batch-edit-error">{error}</p>}

                {!pendingChanges ? (
                    <button
                        type="button"
                        className="batch-edit-primary"
                        disabled={features.length === 0}
                        onClick={prepareChanges}
                    >应用修改</button>
                ) : (
                    <div className="batch-edit-confirmation">
                        <strong>即将修改 {features.length} 个地块</strong>
                        <ul>
                            {Object.entries(pendingChanges).map(([field, value]) => {
                                const typedField = field as EditableField;
                                const nextValue = typedField === "landUseType"
                                    ? LAND_USE_LABELS[value as LandUseType]
                                    : String(value);

                                return (
                                    <li key={field}>
                                        <span>{FIELD_LABELS[typedField]}</span>
                                        <strong>{sourceSummaries[typedField]} → {nextValue}</strong>
                                    </li>
                                );
                            })}
                        </ul>
                        <div>
                            <button
                                type="button"
                                onClick={() => setPendingChanges(null)}
                            >返回</button>
                            <button
                                type="button"
                                onClick={() => onApply(pendingChanges)}
                            ><Check size={14} />确认修改</button>
                        </div>
                    </div>
                )}
            </section>

            <section className="batch-edit-section edit-history-section">
                <header>
                    <div>
                        <span className="batch-edit-eyebrow">EDIT HISTORY</span>
                        <h3>编辑历史</h3>
                    </div>
                    <div className="edit-history-actions">
                        <button type="button" disabled={!canUndo} onClick={onUndo} title="撤销">
                            <Undo2 size={14} />
                        </button>
                        <button type="button" disabled={!canRedo} onClick={onRedo} title="重做">
                            <Redo2 size={14} />
                        </button>
                    </div>
                </header>
                <div className="edit-history-list">
                    {[...history].reverse().slice(0, 8).map((transaction) => (
                        <article key={transaction.id}>
                            <time>{new Date(transaction.timestamp).toLocaleTimeString("zh-CN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}</time>
                            <div>
                                <strong>{transaction.label}</strong>
                                <span>{transaction.featureCount} features</span>
                            </div>
                        </article>
                    ))}
                    {history.length === 0 && <p>暂无编辑记录</p>}
                </div>
            </section>
        </aside>
    );
}
