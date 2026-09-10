import {
    ArrowDownRight,
    ArrowUpRight,
    Equal,
} from "lucide-react";

import type {
    TemporalChangeSummary,
    TemporalFieldType,
    TemporalStatistics,
} from "../../types/temporal";
import { formatTemporalValue } from "../../services/temporal/formatTemporalValue";

interface TemporalStatisticsPanelProps {
    statistics: TemporalStatistics;
    change: TemporalChangeSummary;
    fieldType: TemporalFieldType;
}

function formatArea(areaM2: number) {
    return `${(areaM2 / 1_000_000).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} km²`;
}

export function TemporalStatisticsPanel({
    statistics,
    change,
    fieldType,
}: TemporalStatisticsPanelProps) {
    const ChangeIcon = statistics.changeCount > 0
        ? ArrowUpRight
        : statistics.changeCount < 0
            ? ArrowDownRight
            : Equal;

    return (
        <section className="temporal-statistics-panel">
            <header>
                <span>TEMPORAL SUMMARY</span>
                <strong>当前时间统计</strong>
            </header>
            <dl>
                <div>
                    <dt>当前时间</dt>
                    <dd>{formatTemporalValue(statistics.currentTime, fieldType)}</dd>
                </div>
                <div>
                    <dt>要素数量</dt>
                    <dd>{statistics.featureCount.toLocaleString("zh-CN")}</dd>
                </div>
                <div>
                    <dt>总面积</dt>
                    <dd>{formatArea(statistics.totalAreaM2)}</dd>
                </div>
                <div>
                    <dt>较上一期</dt>
                    <dd className={statistics.changeCount > 0
                        ? "positive"
                        : statistics.changeCount < 0
                            ? "negative"
                            : undefined}
                    >
                        <ChangeIcon size={13} aria-hidden="true" />
                        {statistics.changeCount > 0 ? "+" : ""}
                        {statistics.changeCount.toLocaleString("zh-CN")}
                    </dd>
                </div>
            </dl>
            <p>
                新增 {change.added.length} · 移除 {change.removed.length} ·
                变化 {change.changed.length}
            </p>
        </section>
    );
}
