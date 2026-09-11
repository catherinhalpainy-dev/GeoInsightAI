import {
    Camera,
    Columns2,
    PanelLeftClose,
    RefreshCw,
} from "lucide-react";

import type {
    TemporalCompareSnapshot,
    TemporalCompareSummary,
    TemporalMapCompareConfig,
} from "../../types/mapCompare";
import type { TemporalConfig } from "../../types/temporal";
import { formatTemporalValue } from "../../services/temporal/formatTemporalValue";
import "../../styles/temporalCompare.css";

interface TemporalComparePanelProps {
    temporalConfig: TemporalConfig;
    availableValues: number[];
    config: TemporalMapCompareConfig;
    summary: TemporalCompareSummary | null;
    snapshot: TemporalCompareSnapshot | null;
    capturing: boolean;
    error: string | null;
    onConfigChange: (config: TemporalMapCompareConfig) => void;
    onEnter: () => void;
    onExit: () => void;
    onCapture: () => void;
    onOpenTemporalConfig: () => void;
    onClose: () => void;
}

function formatSigned(value: number, maximumFractionDigits = 0) {
    const formatted = Math.abs(value).toLocaleString("zh-CN", {
        maximumFractionDigits,
    });
    return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : "0";
}

function formatAreaKm2(value: number) {
    return `${(value / 1_000_000).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} km²`;
}

function formatRelativeDelta(after: number, before: number) {
    if (before === 0) return "—";
    return `${formatSigned((after - before) / before * 100, 1)}%`;
}

export function TemporalComparePanel({
    temporalConfig,
    availableValues,
    config,
    summary,
    snapshot,
    capturing,
    error,
    onConfigChange,
    onEnter,
    onExit,
    onCapture,
    onOpenTemporalConfig,
    onClose,
}: TemporalComparePanelProps) {
    const topChanges = summary
        ? [...summary.categories]
            .filter((item) => item.beforeCount > 0 || item.afterCount > 0)
            .sort((first, second) =>
                Math.abs(second.shareDelta) - Math.abs(first.shareDelta) ||
                first.label.localeCompare(second.label, "zh-CN"),
            )
            .slice(0, 5)
        : [];
    const canCompare = temporalConfig.enabled &&
        availableValues.length >= 2 &&
        config.beforeTime < config.afterTime;

    return (
        <aside className="temporal-compare-panel">
            <header className="temporal-compare-header">
                <div>
                    <span>TEMPORAL COMPARE</span>
                    <h2>时序对比</h2>
                    <p>同一数据集、筛选条件与符号体系</p>
                </div>
                <button type="button" aria-label="关闭时序对比面板" onClick={onClose}>×</button>
            </header>

            <div className="temporal-compare-body">
                {!temporalConfig.enabled ? (
                    <section className="temporal-compare-empty">
                        <strong>当前数据尚未启用时间分析</strong>
                        <p>先配置有效时间字段，才能选择前期与后期切片。</p>
                        <button type="button" onClick={onOpenTemporalConfig}>打开时间配置</button>
                    </section>
                ) : availableValues.length < 2 ? (
                    <section className="temporal-compare-empty">
                        <strong>可用时间点不足</strong>
                        <p>当前数据至少需要两个真实时间点才能进行时序对比。</p>
                    </section>
                ) : (
                    <>
                        <section>
                            <span className="temporal-compare-eyebrow">COMPARE RANGE</span>
                            <div className="temporal-compare-fields">
                                <label>前期
                                    <select
                                        value={config.beforeTime}
                                        disabled={config.enabled}
                                        onChange={(event) => onConfigChange({
                                            ...config,
                                            beforeTime: Number(event.currentTarget.value),
                                        })}
                                    >
                                        {availableValues.map((value) => (
                                            <option key={value} value={value}>
                                                {formatTemporalValue(value, temporalConfig.type)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>后期
                                    <select
                                        value={config.afterTime}
                                        disabled={config.enabled}
                                        onChange={(event) => onConfigChange({
                                            ...config,
                                            afterTime: Number(event.currentTarget.value),
                                        })}
                                    >
                                        {availableValues.map((value) => (
                                            <option key={value} value={value}>
                                                {formatTemporalValue(value, temporalConfig.type)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <span className="temporal-compare-label">布局</span>
                            <div className="temporal-compare-segmented">
                                <button
                                    type="button"
                                    className={config.layout === "split" ? "active" : ""}
                                    disabled={config.enabled}
                                    onClick={() => onConfigChange({ ...config, layout: "split" })}
                                ><Columns2 size={14} />分屏</button>
                                <button
                                    type="button"
                                    className={config.layout === "swipe" ? "active" : ""}
                                    disabled={config.enabled}
                                    onClick={() => onConfigChange({
                                        ...config,
                                        layout: "swipe",
                                        syncCamera: true,
                                    })}
                                ><PanelLeftClose size={14} />卷帘</button>
                            </div>

                            <label className="temporal-compare-sync">
                                <input
                                    type="checkbox"
                                    checked={config.layout === "swipe" || config.syncCamera}
                                    disabled={config.layout === "swipe"}
                                    onChange={(event) => onConfigChange({
                                        ...config,
                                        syncCamera: event.currentTarget.checked,
                                    })}
                                />
                                同步相机
                            </label>

                            {config.beforeTime >= config.afterTime && (
                                <p className="temporal-compare-error">后期时间应晚于前期时间。</p>
                            )}
                            {error && <p className="temporal-compare-error">{error}</p>}

                            {config.enabled ? (
                                <button type="button" className="temporal-compare-exit" onClick={onExit}>
                                    退出对比
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="temporal-compare-primary"
                                    disabled={!canCompare}
                                    onClick={onEnter}
                                >进入对比</button>
                            )}
                        </section>

                        {summary && (
                            <section>
                                <span className="temporal-compare-eyebrow">COMPARISON SUMMARY</span>
                                <h3>{formatTemporalValue(summary.beforeTime, temporalConfig.type)} → {formatTemporalValue(summary.afterTime, temporalConfig.type)}</h3>
                                <dl className="temporal-compare-metrics">
                                    <div>
                                        <dt>地块数量</dt>
                                        <dd>{summary.beforeFeatureCount} → {summary.afterFeatureCount}</dd>
                                        <span>
                                            {formatSigned(summary.featureCountDelta)} · {formatRelativeDelta(
                                                summary.afterFeatureCount,
                                                summary.beforeFeatureCount,
                                            )}
                                        </span>
                                    </div>
                                    <div>
                                        <dt>总面积</dt>
                                        <dd>{formatAreaKm2(summary.beforeTotalAreaM2)} → {formatAreaKm2(summary.afterTotalAreaM2)}</dd>
                                        <span>{formatSigned(summary.totalAreaDeltaM2 / 1_000_000, 2)} km²</span>
                                    </div>
                                </dl>

                                <h4>用地变化 TOP</h4>
                                <div className="temporal-compare-category-list">
                                    {topChanges.map((item) => (
                                        <div key={item.key}>
                                            <strong>{item.label}</strong>
                                            <span>{(item.beforeShare * 100).toFixed(1)}% → {(item.afterShare * 100).toFixed(1)}%</span>
                                            <em>{formatSigned(item.shareDelta * 100, 1)} pp</em>
                                        </div>
                                    ))}
                                </div>
                                <p className="temporal-compare-note">
                                    仅比较时间切片的聚合差异，不推断具体地块转化关系。
                                </p>
                            </section>
                        )}

                        {config.enabled && (
                            <section>
                                <span className="temporal-compare-eyebrow">COMPARE SNAPSHOT</span>
                                {snapshot ? (
                                    <p className="temporal-compare-snapshot-status">
                                        已捕获 {new Date(snapshot.capturedAt).toLocaleTimeString("zh-CN")}
                                        · 前期{snapshot.beforeMap.dataUrl ? "可用" : "失败"}
                                        · 后期{snapshot.afterMap.dataUrl ? "可用" : "失败"}
                                    </p>
                                ) : (
                                    <p className="temporal-compare-snapshot-status">尚未捕获报告用对比地图。</p>
                                )}
                                <button
                                    type="button"
                                    className="temporal-compare-capture"
                                    disabled={capturing}
                                    onClick={onCapture}
                                >
                                    {capturing ? <RefreshCw className="spin" size={14} /> : <Camera size={14} />}
                                    {capturing ? "正在捕获..." : "捕获对比快照"}
                                </button>
                            </section>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
}
