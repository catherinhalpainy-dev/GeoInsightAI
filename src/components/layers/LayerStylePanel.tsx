import {
    COLOR_RAMPS,
} from "../../constants/colorRamps";
import {
    LAND_USE_COLORS,
    LAND_USE_LABELS,
    LAND_USE_TYPES,
} from "../../constants/landUse";
import {
    LAYER_STYLE_PRESETS,
} from "../../constants/layerStylePresets";
import type {
    ClassificationMethod,
    GraduatedClassCount,
    GraduatedField,
    LayerStyle,
    SymbologyMode,
} from "../../types/layerStyle";
import "../../styles/layerStyle.css";

interface LayerStylePanelProps {
    style: LayerStyle;
    onChange: <Key extends keyof LayerStyle>(
        key: Key,
        value: LayerStyle[Key],
    ) => void;
    onReset: () => void;
    onSave: () => void;
    hasUnsavedChanges: boolean;
    onApplyReset: (
        presetStyle: Partial<LayerStyle>,
    ) => void;
}

const SYMBOLOGY_MODES: readonly {
    value: SymbologyMode;
    label: string;
    description: string;
}[] = [
    {
        value: "single",
        label: "单一符号",
        description: "Single",
    },
    {
        value: "categorized",
        label: "唯一值",
        description: "Unique",
    },
    {
        value: "graduated",
        label: "分级设色",
        description: "Graduated",
    },
];

const GRADUATED_FIELDS: readonly {
    value: GraduatedField;
    label: string;
}[] = [
    {
        value: "areaM2",
        label: "面积",
    },
    {
        value: "builtYear",
        label: "建成年份",
    },
];

const CLASSIFICATION_METHODS: readonly {
    value: ClassificationMethod;
    label: string;
    description: string;
}[] = [
    {
        value: "equalInterval",
        label: "等距",
        description: "Equal Interval",
    },
    {
        value: "quantile",
        label: "分位数",
        description: "Quantile",
    },
];

const CLASS_COUNTS: readonly GraduatedClassCount[] = [
    3,
    4,
    5,
    6,
];

const MODE_DESCRIPTIONS: Record<
    SymbologyMode,
    string
> = {
    single: "单一符号",
    categorized: "用地类型唯一值",
    graduated: "数值字段分级设色",
};

export function LayerStylePanel({
    style,
    onChange,
    onReset,
    onApplyReset,
    onSave,
    hasUnsavedChanges,
}: LayerStylePanelProps) {
    return (
        <aside className="layer-style-panel">
            <header className="layer-style-header">
                <span>THEMATIC MAPPING</span>
                <h2>图层样式</h2>
                <p>
                    城市用地分类面 ·
                    {" "}
                    {MODE_DESCRIPTIONS[
                        style.symbologyMode
                    ]}
                </p>
            </header>

            <section className="style-section">
                <span className="style-section-eyebrow">
                    SYMBOLOGY
                </span>
                <h3>符号系统</h3>

                <div
                    className="symbology-mode-control"
                    role="group"
                    aria-label="渲染方式"
                >
                    {SYMBOLOGY_MODES.map((mode) => (
                        <button
                            key={mode.value}
                            type="button"
                            className={
                                style.symbologyMode === mode.value
                                    ? "is-active"
                                    : undefined
                            }
                            aria-pressed={
                                style.symbologyMode === mode.value
                            }
                            onClick={() => {
                                onChange(
                                    "symbologyMode",
                                    mode.value,
                                );
                            }}
                        >
                            <span>{mode.label}</span>
                            <small>{mode.description}</small>
                        </button>
                    ))}
                </div>
            </section>

            {style.symbologyMode === "categorized" && (
                <section className="style-section">
                    <span className="style-section-eyebrow">
                        UNIQUE VALUES
                    </span>
                    <h3>唯一值分类</h3>

                    <div className="style-data-field">
                        <span>字段</span>
                        <strong>用地类型</strong>
                        <small>landUseType</small>
                    </div>

                    <ul className="style-symbol-list">
                        {LAND_USE_TYPES.map((type) => (
                            <li key={type}>
                                <span
                                    className="style-symbol-swatch"
                                    style={{
                                        backgroundColor:
                                            LAND_USE_COLORS[type],
                                    }}
                                />
                                <span>
                                    {LAND_USE_LABELS[type]}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {style.symbologyMode === "graduated" && (
                <section className="style-section">
                    <span className="style-section-eyebrow">
                        GRADUATED
                    </span>
                    <h3>分级规则</h3>

                    <div className="style-control-group">
                        <span>字段</span>
                        <div className="style-segmented-control">
                            {GRADUATED_FIELDS.map((field) => (
                                <button
                                    key={field.value}
                                    type="button"
                                    className={
                                        style.graduatedField === field.value
                                            ? "is-active"
                                            : undefined
                                    }
                                    aria-pressed={
                                        style.graduatedField === field.value
                                    }
                                    onClick={() => {
                                        onChange(
                                            "graduatedField",
                                            field.value,
                                        );
                                    }}
                                >
                                    {field.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="style-control-group">
                        <span>分类方法</span>
                        <div className="style-method-control">
                            {CLASSIFICATION_METHODS.map((method) => (
                                <button
                                    key={method.value}
                                    type="button"
                                    className={
                                        style.classificationMethod === method.value
                                            ? "is-active"
                                            : undefined
                                    }
                                    aria-pressed={
                                        style.classificationMethod === method.value
                                    }
                                    onClick={() => {
                                        onChange(
                                            "classificationMethod",
                                            method.value,
                                        );
                                    }}
                                >
                                    <span>{method.label}</span>
                                    <small>{method.description}</small>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="style-control-group">
                        <span>级数</span>
                        <div className="style-class-counts">
                            {CLASS_COUNTS.map((count) => (
                                <button
                                    key={count}
                                    type="button"
                                    className={
                                        style.classCount === count
                                            ? "is-active"
                                            : undefined
                                    }
                                    aria-pressed={
                                        style.classCount === count
                                    }
                                    onClick={() => {
                                        onChange(
                                            "classCount",
                                            count,
                                        );
                                    }}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="style-control-group">
                        <span>色带</span>
                        <div className="style-color-ramps">
                            {COLOR_RAMPS.map((ramp) => (
                                <button
                                    key={ramp.id}
                                    type="button"
                                    className={
                                        style.colorRamp === ramp.id
                                            ? "is-active"
                                            : undefined
                                    }
                                    aria-pressed={
                                        style.colorRamp === ramp.id
                                    }
                                    aria-label={`${ramp.label} 色带`}
                                    onClick={() => {
                                        onChange(
                                            "colorRamp",
                                            ramp.id,
                                        );
                                    }}
                                >
                                    <span>{ramp.label}</span>
                                    <span className="style-ramp-preview">
                                        {ramp.colors.map((color) => (
                                            <i
                                                key={color}
                                                style={{
                                                    backgroundColor: color,
                                                }}
                                            />
                                        ))}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="style-class-preview">
                        <div>
                            <span>分类结果</span>
                            <small>
                                {style.graduatedField === "areaM2"
                                    ? "m²"
                                    : "年份"}
                            </small>
                        </div>

                        {style.graduatedClasses.length > 0 ? (
                            <ul>
                                {style.graduatedClasses.map(
                                    (item, index) => (
                                        <li
                                            key={`${item.min}-${item.max}-${index}`}
                                        >
                                            <span
                                                className="style-symbol-swatch"
                                                style={{
                                                    backgroundColor:
                                                        item.color,
                                                }}
                                            />
                                            <span>{item.label}</span>
                                        </li>
                                    ),
                                )}
                            </ul>
                        ) : (
                            <p>当前筛选结果无有效数值</p>
                        )}
                    </div>
                </section>
            )}

            <section className="style-section">
                <span className="style-section-eyebrow">
                    APPEARANCE
                </span>
                <h3>填充外观</h3>

                <div className="style-row">
                    <label htmlFor="fill-visible">
                        显示填充
                    </label>
                    <input
                        id="fill-visible"
                        type="checkbox"
                        checked={style.fillVisible}
                        onChange={(event) => {
                            onChange(
                                "fillVisible",
                                event.currentTarget.checked,
                            );
                        }}
                    />
                </div>

                {style.symbologyMode === "single" && (
                    <div className="style-row">
                        <label htmlFor="fill-color">
                            填充颜色
                        </label>
                        <input
                            id="fill-color"
                            type="color"
                            value={style.fillColor}
                            onChange={(event) => {
                                onChange(
                                    "fillColor",
                                    event.currentTarget.value,
                                );
                            }}
                        />
                    </div>
                )}

                <div className="style-row">
                    <label htmlFor="fill-opacity">
                        填充透明度
                    </label>
                    <div className="style-range">
                        <input
                            id="fill-opacity"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={style.fillOpacity * 100}
                            onChange={(event) => {
                                onChange(
                                    "fillOpacity",
                                    Number(
                                        event.currentTarget.value,
                                    ) / 100,
                                );
                            }}
                        />
                        <span className="style-number">
                            {Math.round(
                                style.fillOpacity * 100,
                            )}
                            %
                        </span>
                    </div>
                </div>
            </section>

            <section className="style-section">
                <span className="style-section-eyebrow">
                    OUTLINE
                </span>
                <h3>边框</h3>

                <div className="style-row">
                    <label htmlFor="outline-visible">
                        显示边框
                    </label>
                    <input
                        id="outline-visible"
                        type="checkbox"
                        checked={style.outlineVisible}
                        onChange={(event) => {
                            onChange(
                                "outlineVisible",
                                event.currentTarget.checked,
                            );
                        }}
                    />
                </div>

                <div className="style-row">
                    <label htmlFor="outline-color">
                        边框颜色
                    </label>
                    <input
                        id="outline-color"
                        type="color"
                        value={style.outlineColor}
                        onChange={(event) => {
                            onChange(
                                "outlineColor",
                                event.currentTarget.value,
                            );
                        }}
                    />
                </div>

                <div className="style-row">
                    <label htmlFor="outline-width">
                        边框宽度
                    </label>
                    <div className="style-range">
                        <input
                            id="outline-width"
                            type="range"
                            min="0.5"
                            max="6"
                            step="0.5"
                            value={style.outlineWidth}
                            onChange={(event) => {
                                onChange(
                                    "outlineWidth",
                                    Number(
                                        event.currentTarget.value,
                                    ),
                                );
                            }}
                        />
                        <span className="style-number">
                            {style.outlineWidth}px
                        </span>
                    </div>
                </div>

                <div className="style-row">
                    <label htmlFor="outline-opacity">
                        边框透明度
                    </label>
                    <div className="style-range">
                        <input
                            id="outline-opacity"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={style.outlineOpacity * 100}
                            onChange={(event) => {
                                onChange(
                                    "outlineOpacity",
                                    Number(
                                        event.currentTarget.value,
                                    ) / 100,
                                );
                            }}
                        />
                        <span className="style-number">
                            {Math.round(
                                style.outlineOpacity * 100,
                            )}
                            %
                        </span>
                    </div>
                </div>
            </section>

            <section className="style-section">
                <span className="style-section-eyebrow">
                    PRESETS
                </span>
                <h3>快速预设</h3>

                <div className="style-presets">
                    {LAYER_STYLE_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            className="style-preset"
                            onClick={() => {
                                if (preset.id === "default") {
                                    onReset();
                                    return;
                                }

                                onApplyReset(preset.style);
                            }}
                        >
                            {preset.name}
                        </button>
                    ))}
                </div>
            </section>

            <footer className="layer-style-actions">
                <button
                    type="button"
                    onClick={onReset}
                >
                    重置
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!hasUnsavedChanges}
                >
                    保存更改
                </button>
            </footer>
        </aside>
    );
}
