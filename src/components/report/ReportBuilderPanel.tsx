import {
    ArrowDown,
    ArrowUp,
    FileText,
    RefreshCw,
    Sparkles,
    Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import type {
    ReportAiStatus,
    ReportDraft,
    ReportSectionConfig,
    ReportSectionType,
    ReportSnapshotStatus,
} from "../../types/report";
import "../../styles/reportBuilder.css";

export interface ReportBuilderConfig {
    title: string;
    subtitle: string;
    author?: string;
    sections: ReportSectionConfig[];
}

interface ReportBuilderPanelProps {
    draft: ReportDraft | null;
    currentWorkspaceRevision: number;
    hasDataQualityReport: boolean;
    snapshotStatus: ReportSnapshotStatus;
    aiStatus: ReportAiStatus;
    message: string | null;
    onGenerateSnapshot: (config: ReportBuilderConfig) => void;
    onGenerateAiInsights: () => void;
    onDraftChange: (draft: ReportDraft) => void;
    onPreview: () => void;
    onClose: () => void;
}

const SECTION_DEFINITIONS: readonly {
    type: ReportSectionType;
    title: string;
}[] = [
    { type: "executive-summary", title: "执行摘要" },
    { type: "map", title: "当前地图" },
    { type: "kpi", title: "核心指标" },
    { type: "land-use-distribution", title: "用地类型分布" },
    { type: "area-analysis", title: "面积分析" },
    { type: "spatial-analysis", title: "空间分析结果" },
    { type: "data-quality", title: "数据质量" },
    { type: "analysis-layers", title: "分析结果图层" },
    { type: "methodology", title: "方法说明" },
];

function createDefaultSections(hasDataQualityReport: boolean) {
    return SECTION_DEFINITIONS.map((section, order) => ({
        id: crypto.randomUUID(),
        ...section,
        enabled: section.type !== "data-quality" || hasDataQualityReport,
        order,
    }));
}

export function ReportBuilderPanel({
    draft,
    currentWorkspaceRevision,
    hasDataQualityReport,
    snapshotStatus,
    aiStatus,
    message,
    onGenerateSnapshot,
    onGenerateAiInsights,
    onDraftChange,
    onPreview,
    onClose,
}: ReportBuilderPanelProps) {
    const [title, setTitle] = useState("城市空间分析报告");
    const [subtitle, setSubtitle] = useState("GeoInsight AI Analysis");
    const [author, setAuthor] = useState("");
    const [sections, setSections] = useState<ReportSectionConfig[]>(
        () => createDefaultSections(hasDataQualityReport),
    );

    useEffect(() => {
        if (!draft) {
            return;
        }

        setTitle(draft.title);
        setSubtitle(draft.subtitle);
        setAuthor(draft.author ?? "");
        setSections([...draft.sections].sort((a, b) => a.order - b.order));
    }, [draft]);

    function updateDraftMetadata(
        next: Partial<Pick<ReportDraft, "title" | "subtitle" | "author">>,
    ) {
        if (draft) {
            onDraftChange({ ...draft, ...next });
        }
    }

    function updateSections(nextSections: ReportSectionConfig[]) {
        const normalized = nextSections.map((section, order) => ({
            ...section,
            order,
        }));
        setSections(normalized);

        if (draft) {
            onDraftChange({ ...draft, sections: normalized });
        }
    }

    function moveSection(index: number, direction: -1 | 1) {
        const nextIndex = index + direction;

        if (nextIndex < 0 || nextIndex >= sections.length) {
            return;
        }

        const next = [...sections];
        [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
        updateSections(next);
    }

    const snapshotStale = draft !== null &&
        draft.snapshot.workspaceRevisionAtSnapshot !== currentWorkspaceRevision;
    const snapshotBusy = snapshotStatus === "capturing";
    const aiBusy = aiStatus === "generating";

    return (
        <aside className="report-builder-panel">
            <header className="report-builder-header">
                <div>
                    <span>REPORT BUILDER</span>
                    <h2>分析报告</h2>
                </div>
                <button type="button" aria-label="关闭报告中心" onClick={onClose}>×</button>
            </header>

            <div className="report-builder-body">
                <section>
                    <span className="report-builder-eyebrow">REPORT INFO</span>
                    <label>报告标题
                        <input
                            maxLength={80}
                            value={title}
                            onChange={(event) => {
                                const value = event.currentTarget.value;
                                setTitle(value);
                                updateDraftMetadata({ title: value });
                            }}
                        />
                    </label>
                    <label>副标题
                        <input
                            maxLength={120}
                            value={subtitle}
                            onChange={(event) => {
                                const value = event.currentTarget.value;
                                setSubtitle(value);
                                updateDraftMetadata({ subtitle: value });
                            }}
                        />
                    </label>
                    <label>作者（可选）
                        <input
                            maxLength={60}
                            value={author}
                            onChange={(event) => {
                                const value = event.currentTarget.value;
                                setAuthor(value);
                                updateDraftMetadata({ author: value || undefined });
                            }}
                        />
                    </label>
                </section>

                <section>
                    <span className="report-builder-eyebrow">SECTIONS</span>
                    <div className="report-section-config-list">
                        {sections.map((section, index) => (
                            <div key={section.id}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={section.enabled}
                                        disabled={
                                            section.type === "data-quality" &&
                                            !hasDataQualityReport &&
                                            !draft?.snapshot.dataQuality.available
                                        }
                                        onChange={(event) => updateSections(
                                            sections.map((item) => item.id === section.id
                                                ? { ...item, enabled: event.currentTarget.checked }
                                                : item,
                                            ),
                                        )}
                                    />
                                    <span>{section.title}</span>
                                </label>
                                <button
                                    type="button"
                                    disabled={index === 0}
                                    aria-label={`上移${section.title}`}
                                    onClick={() => moveSection(index, -1)}
                                ><ArrowUp size={13} /></button>
                                <button
                                    type="button"
                                    disabled={index === sections.length - 1}
                                    aria-label={`下移${section.title}`}
                                    onClick={() => moveSection(index, 1)}
                                ><ArrowDown size={13} /></button>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <span className="report-builder-eyebrow">SNAPSHOT</span>
                    {draft ? (
                        <div className="report-snapshot-summary">
                            <div>
                                <strong>{new Date(draft.snapshot.generatedAt).toLocaleString("zh-CN")}</strong>
                                <span>快照时间</span>
                            </div>
                            <div>
                                <strong>{draft.snapshot.kpi.featureCount.toLocaleString("zh-CN")}</strong>
                                <span>要素</span>
                            </div>
                            <div>
                                <strong>{draft.snapshot.spatialAnalysis.analysisResultLayers.length}</strong>
                                <span>分析结果</span>
                            </div>
                            <div>
                                <strong>{draft.snapshot.map.dataUrl ? "已捕获" : "不可用"}</strong>
                                <span>地图</span>
                            </div>
                        </div>
                    ) : (
                        <p className="report-builder-hint">生成后，报告将固定使用该时间点的统计与分析结果。</p>
                    )}

                    {snapshotStale && (
                        <p className="report-builder-warning">工作区已更新，建议刷新报告快照。</p>
                    )}
                    {draft?.snapshot.map.captureError && (
                        <p className="report-builder-warning">地图快照生成失败，可重新捕获地图。</p>
                    )}

                    <button
                        type="button"
                        className="report-builder-primary"
                        disabled={snapshotBusy || !title.trim()}
                        onClick={() => onGenerateSnapshot({
                            title: title.trim(),
                            subtitle: subtitle.trim(),
                            author: author.trim() || undefined,
                            sections,
                        })}
                    >
                        {draft ? <RefreshCw size={14} /> : <FileText size={14} />}
                        {snapshotBusy
                            ? "正在捕获地图..."
                            : draft?.snapshot.map.captureError
                                ? "重新捕获地图"
                                : draft
                                    ? "更新快照"
                                    : "生成分析快照"}
                    </button>
                </section>

                {draft && (
                    <section>
                        <span className="report-builder-eyebrow">AI INSIGHTS</span>
                        <button
                            type="button"
                            className="report-builder-ai"
                            disabled={aiBusy}
                            onClick={onGenerateAiInsights}
                        ><Sparkles size={14} />{aiBusy ? "正在分析..." : "生成 AI 洞察"}</button>

                        <label>执行摘要
                            <textarea
                                rows={5}
                                maxLength={2_000}
                                value={draft.executiveSummary}
                                onChange={(event) => onDraftChange({
                                    ...draft,
                                    executiveSummary: event.currentTarget.value,
                                })}
                            />
                        </label>

                        <div className="report-insight-editor-list">
                            {draft.insights.map((insight) => (
                                <article key={insight.id}>
                                    <header>
                                        <input
                                            aria-label="洞察标题"
                                            maxLength={120}
                                            value={insight.title}
                                            onChange={(event) => onDraftChange({
                                                ...draft,
                                                insights: draft.insights.map((item) =>
                                                    item.id === insight.id
                                                        ? { ...item, title: event.currentTarget.value }
                                                        : item,
                                                ),
                                            })}
                                        />
                                        <button
                                            type="button"
                                            aria-label={`删除${insight.title}`}
                                            onClick={() => onDraftChange({
                                                ...draft,
                                                insights: draft.insights.filter(
                                                    (item) => item.id !== insight.id,
                                                ),
                                            })}
                                        ><Trash2 size={13} /></button>
                                    </header>
                                    <textarea
                                        aria-label={`${insight.title}内容`}
                                        rows={4}
                                        maxLength={1_000}
                                        value={insight.content}
                                        onChange={(event) => onDraftChange({
                                            ...draft,
                                            insights: draft.insights.map((item) =>
                                                item.id === insight.id
                                                    ? { ...item, content: event.currentTarget.value }
                                                    : item,
                                            ),
                                        })}
                                    />
                                </article>
                            ))}
                        </div>

                        <button type="button" className="report-preview-button" onClick={onPreview}>
                            预览报告
                        </button>
                    </section>
                )}

                {message && (
                    <p className={snapshotStatus === "error" || aiStatus === "error"
                        ? "report-builder-message error"
                        : "report-builder-message"}
                    >{message}</p>
                )}
            </div>
        </aside>
    );
}
