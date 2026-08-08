import type { LayerStyle } from "../../types/layerStyle";

interface LayerStylePanelProps {
    style: LayerStyle;
    onChange: <
        Key extends keyof LayerStyle>(
            key: Key,
            value: LayerStyle[Key],
        ) => void;

    onReset: () => void;
    onSave: () => void;
    hasUnsavedChanges: boolean;
}
//  onSave, hasUnsavedChanges

export function LayerStylePanel({ style, onChange, onReset, }: LayerStylePanelProps) {
    return (
        <aside className="layer-style-panel">
            <header className="layer-style-header">
                <h2>图层样式</h2>
                <p>城市用地分类面</p>
            </header>

            {/* 填充样式 */}
            <section className="style-section">
                <h3>填充</h3>

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
                                const percentage =
                                    Number(
                                        event.currentTarget.value,
                                    );

                                onChange(
                                    "fillOpacity",
                                    percentage / 100,
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

            {/* 边框样式 */}
            <section className="style-section">
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
                            value={
                                style.outlineOpacity * 100
                            }
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

            {/* 颜色模式 */}
            <section className="style-section">
                <h3>颜色模式</h3>

                <div className="style-row">
                    <label htmlFor="color-mode">
                        渲染方式
                    </label>

                    <select
                        id="color-mode"
                        value={style.colorMode}
                        onChange={(event) => {
                            const value =
                                event.currentTarget.value;

                            if (
                                value === "single" ||
                                value === "classified"
                            ) {
                                onChange(
                                    "colorMode",
                                    value,
                                );
                            }
                        }}
                    >
                        <option value="classified">
                            分类色
                        </option>

                        <option value="single">
                            单一颜色
                        </option>
                    </select>
                </div>
            </section>

            <footer className="layer-style-actions">
                <button
                    type="button"
                    onClick={onReset}
                >
                    重置
                </button>
            </footer>
        </aside>
    );
}

