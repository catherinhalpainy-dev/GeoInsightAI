import { useEffect, useMemo, useState } from "react";
import { Clock3, X } from "lucide-react";

import type {
    TemporalChangeSummary,
    TemporalConfig,
    TemporalFieldCandidate,
    TemporalStatistics,
} from "../../types/temporal";
import { formatTemporalValue } from "../../services/temporal/formatTemporalValue";
import { TemporalStatisticsPanel } from "./TemporalStatisticsPanel";
import "../../styles/temporal.css";

interface TemporalConfigPanelProps {
    candidates: readonly TemporalFieldCandidate[];
    config: TemporalConfig;
    statistics: TemporalStatistics | null;
    change: TemporalChangeSummary | null;
    onApply: (config: TemporalConfig) => void;
    onClose: () => void;
}

const TYPE_LABELS = {
    year: "Year",
    date: "Date",
    datetime: "Date & Time",
} as const;

export function TemporalConfigPanel({
    candidates,
    config,
    statistics,
    change,
    onApply,
    onClose,
}: TemporalConfigPanelProps) {
    const initialCandidate = candidates.find((item) => item.field === config.field) ??
        candidates[0] ?? null;
    const [enabled, setEnabled] = useState(config.enabled);
    const [field, setField] = useState(config.field || initialCandidate?.field || "");
    const selectedCandidate = useMemo(
        () => candidates.find((item) => item.field === field) ?? null,
        [candidates, field],
    );

    useEffect(() => {
        setEnabled(config.enabled);
        setField(config.field || candidates[0]?.field || "");
    }, [candidates, config.enabled, config.field]);

    function apply() {
        if (!enabled) {
            onApply({ ...config, enabled: false });
            return;
        }

        if (!selectedCandidate) {
            return;
        }

        const keepCurrent = config.field === selectedCandidate.field &&
            selectedCandidate.values.includes(config.current);
        onApply({
            enabled: true,
            field: selectedCandidate.field,
            type: selectedCandidate.type,
            min: selectedCandidate.min,
            max: selectedCandidate.max,
            current: keepCurrent ? config.current : selectedCandidate.max,
        });
    }

    return (
        <aside className="temporal-config-panel">
            <header className="temporal-panel-header">
                <div>
                    <span>TEMPORAL GIS</span>
                    <h2>时间分析</h2>
                    <p>按属性时间精确筛选当前主数据。</p>
                </div>
                <button type="button" aria-label="关闭时间分析" onClick={onClose}>
                    <X size={17} aria-hidden="true" />
                </button>
            </header>

            <div className="temporal-panel-body">
                <section>
                    <div className="temporal-section-title">
                        <Clock3 size={15} aria-hidden="true" />
                        <strong>时间配置</strong>
                    </div>
                    <label className="temporal-enable-row">
                        <input
                            type="checkbox"
                            checked={enabled}
                            disabled={candidates.length === 0}
                            onChange={(event) => setEnabled(event.currentTarget.checked)}
                        />
                        <span>启用时间过滤</span>
                    </label>

                    {candidates.length === 0 ? (
                        <p className="temporal-empty">
                            未检测到有效时间字段。字段名需包含 year、date、time、created 或 updated。
                        </p>
                    ) : (
                        <div className="temporal-fields">
                            <label>
                                <span>时间字段</span>
                                <select value={field} onChange={(event) => setField(event.currentTarget.value)}>
                                    {candidates.map((candidate) => (
                                        <option key={candidate.field} value={candidate.field}>
                                            {candidate.field} · {candidate.validCount} values
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>类型</span>
                                <input value={selectedCandidate ? TYPE_LABELS[selectedCandidate.type] : "—"} readOnly />
                            </label>
                            {selectedCandidate && (
                                <div className="temporal-range-summary">
                                    <span>检测范围</span>
                                    <strong>
                                        {formatTemporalValue(selectedCandidate.min, selectedCandidate.type)}
                                        {" — "}
                                        {formatTemporalValue(selectedCandidate.max, selectedCandidate.type)}
                                    </strong>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        className="temporal-apply-button"
                        disabled={enabled && !selectedCandidate}
                        onClick={apply}
                    >
                        应用
                    </button>
                </section>

                {config.enabled && statistics && change && (
                    <TemporalStatisticsPanel
                        statistics={statistics}
                        change={change}
                        fieldType={config.type}
                    />
                )}
            </div>
        </aside>
    );
}
