import {
    Download,
    Layers2,
    LocateFixed,
    RefreshCw,
    ScanSearch,
    ShieldCheck,
    Wrench,
    X,
} from "lucide-react";
import {
    useMemo,
    useState,
} from "react";

import type {
    CleanedDatasetResult,
    DataQualityCategory,
    DataQualityIssue,
    DataQualityReport,
    DataQualitySeverity,
} from "../../types/dataQuality";

export interface DataQualityTargetOption {
    id: string;
    name: string;
    featureCount: number;
}

interface DataQualityPanelProps {
    targets: DataQualityTargetOption[];
    targetId: string;
    report: DataQualityReport | null;
    selectedIssueId: string | null;
    scanning: boolean;
    error: string | null;
    cleanedDataset: CleanedDatasetResult | null;
    cleanedReport: DataQualityReport | null;
    onTargetChange: (targetId: string) => void;
    onRunScan: () => void;
    onSelectIssue: (issue: DataQualityIssue) => void;
    onCreateCleanedDataset: () => void;
    onAddCleanedLayer: () => void;
    onExportCleaned: () => void;
    onExportReport: () => void;
    onRescanCleaned: () => void;
    onClose: () => void;
}

type SeverityFilter = "all" | Exclude<DataQualitySeverity, "info">;
type CategoryFilter = "all" | DataQualityCategory;

const ISSUE_LABELS: Record<DataQualityIssue["code"], string> = {
    invalid_feature_structure: "要素结构无效",
    missing_geometry: "缺少几何",
    unsupported_geometry: "不支持的几何类型",
    invalid_coordinate: "坐标无效或越界",
    invalid_polygon_ring: "Polygon 环无效",
    self_intersection: "Polygon 自相交",
    duplicate_feature_id: "要素 ID 重复",
    missing_feature_id: "缺少要素 ID",
    missing_required_attribute: "缺少必填属性",
    invalid_attribute_value: "属性值无效",
    invalid_area: "面积字段无效",
    area_mismatch: "属性面积与几何面积不一致",
};

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
    all: "全部类别",
    structure: "结构",
    geometry: "几何",
    attributes: "属性",
    id: "ID",
};

function IssueRow({
    issue,
    selected,
    onSelect,
}: {
    issue: DataQualityIssue;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <article
            className={`quality-issue-row quality-issue-${issue.severity}${selected ? " is-selected" : ""}`}
        >
            <div className="quality-issue-heading">
                <span className="quality-severity-label">
                    {issue.severity === "error" ? "ERROR" : "WARNING"}
                </span>
                {issue.fixable && (
                    <span className="quality-fixable-badge">
                        <Wrench size={11} aria-hidden="true" />
                        可安全修复
                    </span>
                )}
            </div>
            <strong>{ISSUE_LABELS[issue.code]}</strong>
            <span className="quality-issue-feature">
                Feature: {issue.featureId ?? `#${issue.featureIndex + 1}`}
            </span>
            <p>{issue.message}</p>
            <button
                type="button"
                className="quality-locate-button"
                disabled={!issue.locatable}
                onClick={onSelect}
            >
                <LocateFixed size={13} aria-hidden="true" />
                {issue.locatable ? "定位" : "无法定位"}
            </button>
        </article>
    );
}

export function DataQualityPanel({
    targets,
    targetId,
    report,
    selectedIssueId,
    scanning,
    error,
    cleanedDataset,
    cleanedReport,
    onTargetChange,
    onRunScan,
    onSelectIssue,
    onCreateCleanedDataset,
    onAddCleanedLayer,
    onExportCleaned,
    onExportReport,
    onRescanCleaned,
    onClose,
}: DataQualityPanelProps) {
    const [severity, setSeverity] = useState<SeverityFilter>("all");
    const [category, setCategory] = useState<CategoryFilter>("all");
    const [search, setSearch] = useState("");

    const filteredIssues = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();

        return report?.issues.filter((issue) => {
            const severityMatches = severity === "all" ||
                issue.severity === severity;
            const categoryMatches = category === "all" ||
                issue.category === category;
            const searchMatches = normalizedSearch === "" ||
                (issue.featureId ?? `#${issue.featureIndex + 1}`)
                    .toLocaleLowerCase()
                    .includes(normalizedSearch);

            return severityMatches && categoryMatches && searchMatches;
        }) ?? [];
    }, [category, report, search, severity]);

    return (
        <aside className="workspace-side-panel data-quality-panel">
            <header className="workspace-panel-header">
                <div>
                    <span className="panel-eyebrow">DATA QUALITY</span>
                    <h2>数据质量</h2>
                </div>
                <button
                    type="button"
                    className="workspace-panel-close"
                    onClick={onClose}
                    aria-label="关闭数据质量面板"
                >
                    <X size={17} />
                </button>
            </header>

            <div className="quality-panel-content">
                <section className="quality-section">
                    <span className="panel-eyebrow">SCAN TARGET</span>
                    <label className="quality-field">
                        <span>检查图层</span>
                        <select
                            value={targetId}
                            onChange={(event) => onTargetChange(event.target.value)}
                        >
                            {targets.map((target) => (
                                <option key={target.id} value={target.id}>
                                    {target.name} · {target.featureCount} 个要素
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        className="quality-primary-button"
                        disabled={scanning || targets.length === 0}
                        onClick={onRunScan}
                    >
                        {scanning
                            ? <RefreshCw className="is-spinning" size={16} />
                            : <ScanSearch size={16} />}
                        {scanning ? "正在检查数据质量..." : "运行质量检查"}
                    </button>
                    {error && <p className="quality-error-message">{error}</p>}
                </section>

                {report && (
                    <>
                        <section className="quality-section quality-summary-section">
                            <div className="quality-summary-heading">
                                <div>
                                    <span className="panel-eyebrow">SUMMARY</span>
                                    <h3>质量概要</h3>
                                </div>
                                <ShieldCheck size={19} aria-hidden="true" />
                            </div>
                            <div className="quality-summary-grid">
                                <div className="quality-pass-rate">
                                    <strong>{(report.passRate * 100).toFixed(1)}%</strong>
                                    <span>通过率</span>
                                </div>
                                <div><strong>{report.totalFeatures}</strong><span>总要素</span></div>
                                <div className="is-error"><strong>{report.errorCount}</strong><span>错误</span></div>
                                <div className="is-warning"><strong>{report.warningCount}</strong><span>警告</span></div>
                            </div>
                        </section>

                        <section className="quality-section">
                            <div className="quality-section-title">
                                <div>
                                    <span className="panel-eyebrow">ISSUES</span>
                                    <h3>问题列表</h3>
                                </div>
                                <span>{filteredIssues.length} / {report.issueCount}</span>
                            </div>
                            <div className="quality-filter-row">
                                {(["all", "error", "warning"] as const).map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={severity === value ? "is-active" : ""}
                                        onClick={() => setSeverity(value)}
                                    >
                                        {value === "all" ? "全部" : value === "error" ? "错误" : "警告"}
                                    </button>
                                ))}
                            </div>
                            <div className="quality-filter-row quality-category-filters">
                                {(["all", "geometry", "attributes", "id", "structure"] as const).map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={category === value ? "is-active" : ""}
                                        onClick={() => setCategory(value)}
                                    >
                                        {CATEGORY_LABELS[value]}
                                    </button>
                                ))}
                            </div>
                            <input
                                className="quality-search-input"
                                type="search"
                                value={search}
                                placeholder="搜索 Feature ID"
                                onChange={(event) => setSearch(event.target.value)}
                            />
                            <div className="quality-issue-list">
                                {filteredIssues.map((issue) => (
                                    <IssueRow
                                        key={issue.id}
                                        issue={issue}
                                        selected={selectedIssueId === issue.id}
                                        onSelect={() => onSelectIssue(issue)}
                                    />
                                ))}
                                {filteredIssues.length === 0 && (
                                    <p className="quality-empty-state">
                                        {report.issueCount === 0
                                            ? "未发现数据质量问题。"
                                            : "当前筛选条件下没有问题。"}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                className="quality-tonal-button"
                                onClick={onExportReport}
                            >
                                <Download size={15} />
                                导出质量报告 CSV
                            </button>
                        </section>

                        <section className="quality-section">
                            <span className="panel-eyebrow">SAFE FIX</span>
                            <h3>非破坏性修复</h3>
                            <p className="quality-section-description">
                                仅修复未闭合环、缺失 ID 与可安全重算的缺失面积，原始数据不会被修改。
                            </p>
                            <button
                                type="button"
                                className="quality-primary-button"
                                disabled={!report.issues.some((issue) => issue.fixable)}
                                onClick={onCreateCleanedDataset}
                            >
                                <Wrench size={15} />
                                生成清洗副本
                            </button>
                        </section>
                    </>
                )}

                {cleanedDataset && (
                    <section className="quality-section quality-cleaned-section">
                        <span className="panel-eyebrow">CLEANED DATASET</span>
                        <h3>清洗完成</h3>
                        <div className="quality-cleaned-metrics">
                            <div><strong>{cleanedDataset.appliedFixCount}</strong><span>应用安全修复</span></div>
                            <div><strong>{cleanedDataset.unresolvedIssueCount}</strong><span>未自动修复</span></div>
                        </div>
                        {cleanedReport && report && (
                            <p className="quality-before-after">
                                错误：{report.errorCount} → {cleanedReport.errorCount}
                            </p>
                        )}
                        <div className="quality-action-grid">
                            <button type="button" onClick={onAddCleanedLayer}>
                                <Layers2 size={14} />添加为新图层
                            </button>
                            <button type="button" onClick={onExportCleaned}>
                                <Download size={14} />导出 GeoJSON
                            </button>
                        </div>
                        <button
                            type="button"
                            className="quality-ghost-button"
                            onClick={onRescanCleaned}
                        >
                            <RefreshCw size={14} />重新检查清洗结果
                        </button>
                    </section>
                )}
            </div>
        </aside>
    );
}
