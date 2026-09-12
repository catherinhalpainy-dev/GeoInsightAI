import { ArrowDown, ArrowUp, Copy, Download, Play, Plus, Save, Trash2, Upload, Workflow as WorkflowIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LAND_USE_LABELS, LAND_USE_TYPES } from "../../constants/landUse";
import { WORKFLOW_TEMPLATES } from "../../constants/workflowTemplates";
import { getAllowedQueryOperators, summarizeAttributeQuery } from "../../services/gis/attributeQuery";
import type { QueryField, QueryOperator } from "../../types/query";
import type {
    AnalysisWorkflow,
    WorkflowInputSource,
    WorkflowRunRecord,
    WorkflowRunStatus,
    WorkflowStep,
    WorkflowValidationIssue,
} from "../../types/workflow";
import { validateWorkflow } from "../../services/workflow/workflowValidator";
import "../../styles/workflow.css";

export interface WorkflowInputOption {
    value: string;
    label: string;
    input: WorkflowInputSource;
    featureCount: number;
    missing?: boolean;
}

interface WorkflowBuilderPanelProps {
    workflows: AnalysisWorkflow[];
    selectedWorkflowId: string | null;
    inputOptions: WorkflowInputOption[];
    temporalValues: number[];
    runStatus: WorkflowRunStatus;
    latestRun: WorkflowRunRecord | null;
    runHistory: WorkflowRunRecord[];
    validationIssues: WorkflowValidationIssue[];
    previewFeatureCount: number | null;
    message: string | null;
    onSelect: (workflowId: string) => void;
    onSave: (workflow: AnalysisWorkflow) => void;
    onNew: () => void;
    onTemplate: (templateId: string) => void;
    onDuplicate: (workflowId: string) => void;
    onDelete: (workflowId: string) => void;
    onRun: (workflow: AnalysisWorkflow) => void;
    onImport: (file: File) => void;
    onExport: (workflow: AnalysisWorkflow) => void;
    onAddPreviewLayer: () => void;
    onExportPreview: () => void;
    onFitResult: (layerId: string) => void;
    onOpenLayers: () => void;
    onClose: () => void;
}

const STEP_LABELS: Record<WorkflowStep["type"], string> = {
    "attribute-query": "ATTRIBUTE QUERY",
    "temporal-filter": "TEMPORAL FILTER",
    "create-buffer": "CREATE BUFFER",
    "spatial-query": "SPATIAL QUERY",
    centroid: "CENTROID",
    dissolve: "DISSOLVE",
    intersection: "INTERSECTION",
    hexbin: "HEXBIN",
};

const FIELD_LABELS: Record<QueryField, string> = {
    id: "要素 ID", landUseType: "用地类型", areaM2: "面积", districtCode: "行政区代码", builtYear: "建成年份",
};

const OPERATOR_LABELS: Record<QueryOperator, string> = {
    eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤", contains: "包含", between: "介于",
};

function inputKey(input: WorkflowInputSource) {
    return input.type === "overlay" || input.type === "analysis-result"
        ? `${input.type}:${input.layerId}`
        : input.type;
}

function createDefaultStep(type: WorkflowStep["type"]): WorkflowStep {
    const id = crypto.randomUUID();
    switch (type) {
        case "attribute-query": return { id, type, enabled: true, query: { logic: "and", groups: [{ id: crypto.randomUUID(), logic: "and", conditions: [{ id: crypto.randomUUID(), field: "landUseType", operator: "eq", value: "commercial" }] }] } };
        case "temporal-filter": return { id, type, enabled: true, temporalValue: 0 };
        case "create-buffer": return { id, type, enabled: true, distanceM: 500 };
        case "spatial-query": return { id, type, enabled: true, relation: "intersects", mask: "buffer" };
        case "centroid": return { id, type, enabled: true };
        case "dissolve": return { id, type, enabled: true, field: "all" };
        case "intersection": return { id, type, enabled: true, overlay: "aoi" };
        case "hexbin": return { id, type, enabled: true, weightMode: "count", cellSizeKm: 0.5 };
    }
}

function stepSummary(step: WorkflowStep) {
    switch (step.type) {
        case "attribute-query": return summarizeAttributeQuery(step.query);
        case "temporal-filter": return `时间值 ${step.temporalValue || "未设置"}`;
        case "create-buffer": return `${step.distanceM.toLocaleString("zh-CN")} m`;
        case "spatial-query": return `${step.relation} · ${step.mask === "buffer" ? "Buffer" : "AOI"}`;
        case "centroid": return "生成中心点";
        case "dissolve": return step.field === "all" ? "全部融合" : "按用地类型融合";
        case "intersection": return `叠加范围：${step.overlay === "buffer" ? "Buffer" : "AOI"}`;
        case "hexbin": return `${step.weightMode === "count" ? "Count" : "Area"} · ${step.cellSizeKm} km`;
    }
}

export function WorkflowBuilderPanel(props: WorkflowBuilderPanelProps) {
    const selected = props.workflows.find((item) => item.id === props.selectedWorkflowId) ?? null;
    const [draft, setDraft] = useState<AnalysisWorkflow | null>(selected);
    const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
    const [templateId, setTemplateId] = useState(WORKFLOW_TEMPLATES[0]?.id ?? "");
    const [stepType, setStepType] = useState<WorkflowStep["type"]>("attribute-query");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const running = props.runStatus === "running";
    const draftIssues = draft ? validateWorkflow(draft) : [];

    useEffect(() => setDraft(selected), [selected]);

    function updateStep(stepId: string, updater: (step: WorkflowStep) => WorkflowStep) {
        setDraft((current) => current ? { ...current, steps: current.steps.map((step) => step.id === stepId ? updater(step) : step) } : current);
    }

    function moveStep(index: number, direction: -1 | 1) {
        setDraft((current) => {
            if (!current) return current;
            const target = index + direction;
            if (target < 0 || target >= current.steps.length) return current;
            const steps = [...current.steps];
            [steps[index], steps[target]] = [steps[target], steps[index]];
            return { ...current, steps };
        });
    }

    return (
        <aside className="workflow-panel">
            <header className="workflow-panel-header">
                <div><span>WORKFLOWS</span><h2>分析模型</h2><p>受约束的顺序 GIS 工作流</p></div>
                <button type="button" aria-label="关闭工作流" onClick={props.onClose}>×</button>
            </header>

            <div className="workflow-panel-body">
                <section className="workflow-library">
                    <div className="workflow-actions">
                        <button type="button" disabled={running} onClick={props.onNew}><Plus size={14} />新建</button>
                        <button type="button" disabled={running} onClick={() => fileInputRef.current?.click()}><Upload size={14} />导入</button>
                        <input ref={fileInputRef} type="file" accept=".json,.geoinsight-workflow.json,application/json" hidden onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) props.onImport(file); event.currentTarget.value = ""; }} />
                    </div>
                    <div className="workflow-template-row">
                        <select value={templateId} disabled={running} onChange={(event) => setTemplateId(event.currentTarget.value)}>
                            {WORKFLOW_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                        </select>
                        <button type="button" disabled={running || !templateId} onClick={() => props.onTemplate(templateId)}>使用模板</button>
                    </div>
                    <div className="workflow-saved-list">
                        {props.workflows.map((workflow) => (
                            <button key={workflow.id} type="button" className={workflow.id === props.selectedWorkflowId ? "active" : ""} onClick={() => props.onSelect(workflow.id)}>
                                <WorkflowIcon size={15} /><span><strong>{workflow.name}</strong><small>{workflow.steps.length} steps</small></span>
                            </button>
                        ))}
                        {props.workflows.length === 0 && <p>暂无已保存工作流。</p>}
                    </div>
                </section>

                {draft && <>
                    <section className="workflow-definition">
                        <label>模型名称<input value={draft.name} disabled={running} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })} /></label>
                        <label>说明<textarea value={draft.description} disabled={running} maxLength={500} onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })} /></label>
                        <div className="workflow-definition-actions">
                            <button type="button" disabled={running} onClick={() => props.onSave({ ...draft, updatedAt: Date.now() })}><Save size={13} />保存</button>
                            <button type="button" disabled={running} onClick={() => props.onDuplicate(draft.id)}><Copy size={13} />复制</button>
                            <button type="button" disabled={running} onClick={() => props.onExport(draft)}><Download size={13} />导出</button>
                            <button type="button" className="danger" disabled={running} onClick={() => { if (window.confirm(`确定删除工作流“${draft.name}”？已生成的分析结果不会删除。`)) props.onDelete(draft.id); }}><Trash2 size={13} />删除</button>
                        </div>
                    </section>

                    <section className="workflow-canvas">
                        <div className="workflow-node input-node"><span>INPUT</span><select value={inputKey(draft.input)} disabled={running} onChange={(event) => { const option = props.inputOptions.find((item) => item.value === event.currentTarget.value); if (option) setDraft({ ...draft, input: option.input }); }}>{props.inputOptions.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.featureCount}</option>)}</select></div>
                        {draft.steps.map((step, index) => {
                            const issue = draftIssues.find((item) => item.stepId === step.id && item.severity === "error");
                            return <div key={step.id} className="workflow-step-wrap">
                                <div className="workflow-arrow">↓</div>
                                <article className={`workflow-node ${expandedStepId === step.id ? "selected" : ""} ${!step.enabled ? "disabled" : ""} ${issue ? "invalid" : ""}`}>
                                    <header><span>{index + 1} · {STEP_LABELS[step.type]}</span><label><input type="checkbox" checked={step.enabled} disabled={running} onChange={(event) => updateStep(step.id, (current) => ({ ...current, enabled: event.currentTarget.checked }))} />启用</label></header>
                                    <p>{stepSummary(step)}</p>
                                    {issue && <small className="workflow-node-error">{issue.message}</small>}
                                    <div className="workflow-node-actions">
                                        <button type="button" disabled={running} onClick={() => setExpandedStepId(expandedStepId === step.id ? null : step.id)}>编辑</button>
                                        <button type="button" disabled={running || index === 0} aria-label="上移" onClick={() => moveStep(index, -1)}><ArrowUp size={12} /></button>
                                        <button type="button" disabled={running || index === draft.steps.length - 1} aria-label="下移" onClick={() => moveStep(index, 1)}><ArrowDown size={12} /></button>
                                        <button type="button" disabled={running} aria-label="删除" onClick={() => setDraft({ ...draft, steps: draft.steps.filter((item) => item.id !== step.id) })}><Trash2 size={12} /></button>
                                    </div>
                                    {expandedStepId === step.id && <StepEditor step={step} temporalValues={props.temporalValues} onChange={(next) => updateStep(step.id, () => next)} />}
                                </article>
                            </div>;
                        })}
                        <div className="workflow-arrow">↓</div>
                        <div className="workflow-add-step"><select value={stepType} disabled={running} onChange={(event) => setStepType(event.currentTarget.value as WorkflowStep["type"])}>{Object.entries(STEP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" disabled={running} onClick={() => { const next = createDefaultStep(stepType); if (next.type === "temporal-filter" && props.temporalValues.length > 0) next.temporalValue = props.temporalValues[0]; setDraft({ ...draft, steps: [...draft.steps, next] }); setExpandedStepId(next.id); }}><Plus size={13} />添加步骤</button></div>
                        <div className="workflow-arrow">↓</div>
                        <div className="workflow-node output-node"><span>OUTPUT</span><select value={draft.output.mode} disabled={running} onChange={(event) => setDraft({ ...draft, output: { ...draft.output, mode: event.currentTarget.value as AnalysisWorkflow["output"]["mode"] } })}><option value="analysis-layer">分析结果图层</option><option value="preview">仅预览</option></select><input value={draft.output.name} disabled={running} maxLength={80} onChange={(event) => setDraft({ ...draft, output: { ...draft.output, name: event.currentTarget.value } })} /></div>
                    </section>

                    {draftIssues.length > 0 && <section className="workflow-validation"><strong>模型检查</strong>{draftIssues.map((issue, index) => <p key={`${issue.stepId}-${issue.code}-${index}`}>{issue.severity === "error" ? "×" : "!"} {issue.message}</p>)}</section>}
                    {props.message && <p className="workflow-panel-message" role="status">{props.message}</p>}
                    <button type="button" className="workflow-run-button" disabled={running || draftIssues.some((issue) => issue.severity === "error")} onClick={() => props.onRun(draft)}><Play size={15} />{running ? "正在运行…" : "运行工作流"}</button>
                </>}

                {props.latestRun && <RunSummary run={props.latestRun} previewFeatureCount={props.previewFeatureCount} onAddPreviewLayer={props.onAddPreviewLayer} onExportPreview={props.onExportPreview} onFitResult={props.onFitResult} onOpenLayers={props.onOpenLayers} />}
                {props.runHistory.length > 0 && <section className="workflow-history"><header><span>RUN HISTORY</span><strong>最近运行</strong></header>{props.runHistory.map((run) => <div key={run.id}><time>{new Date(run.startedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time><span><strong>{run.workflowName}</strong><small>{run.status === "completed" ? `${run.outputFeatureCount} features` : run.errorMessage}</small></span><b className={run.status}>{run.status === "completed" ? "完成" : "失败"}</b></div>)}</section>}
            </div>
        </aside>
    );
}

function StepEditor({ step, temporalValues, onChange }: { step: WorkflowStep; temporalValues: number[]; onChange: (step: WorkflowStep) => void }) {
    if (step.type === "attribute-query") {
        const condition = step.query.groups[0]?.conditions[0];
        if (!condition) return <p className="workflow-editor-note">该查询没有条件，请重新添加此步骤。</p>;
        const update = (patch: Partial<typeof condition>) => onChange({ ...step, query: { ...step.query, groups: step.query.groups.map((group, index) => index === 0 ? { ...group, conditions: group.conditions.map((item, conditionIndex) => conditionIndex === 0 ? { ...item, ...patch } : item) } : group) } });
        return <div className="workflow-step-editor"><select value={condition.field} onChange={(event) => { const field = event.currentTarget.value as QueryField; update({ field, operator: getAllowedQueryOperators(field)[0], value: field === "landUseType" ? "residential" : "", value2: undefined }); }}>{Object.entries(FIELD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={condition.operator} onChange={(event) => update({ operator: event.currentTarget.value as QueryOperator })}>{getAllowedQueryOperators(condition.field).map((operator) => <option key={operator} value={operator}>{OPERATOR_LABELS[operator]}</option>)}</select>{condition.field === "landUseType" ? <select value={condition.value} onChange={(event) => update({ value: event.currentTarget.value })}>{LAND_USE_TYPES.map((type) => <option key={type} value={type}>{LAND_USE_LABELS[type]}</option>)}</select> : <input type={condition.field === "areaM2" || condition.field === "builtYear" ? "number" : "text"} value={condition.value} onChange={(event) => update({ value: event.currentTarget.value })} />}{condition.operator === "between" && <input type="number" value={condition.value2 ?? ""} onChange={(event) => update({ value2: event.currentTarget.value })} />}</div>;
    }
    if (step.type === "temporal-filter") return <div className="workflow-step-editor"><label>时间值<select value={step.temporalValue} onChange={(event) => onChange({ ...step, temporalValue: Number(event.currentTarget.value) })}>{temporalValues.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>{temporalValues.length === 0 && <small>请先配置有效时间字段。</small>}</div>;
    if (step.type === "create-buffer") return <div className="workflow-step-editor"><label>距离（米）<input type="number" min="1" max="50000" value={step.distanceM} onChange={(event) => onChange({ ...step, distanceM: Number(event.currentTarget.value) })} /></label></div>;
    if (step.type === "spatial-query") return <div className="workflow-step-editor"><label>关系<select value={step.relation} onChange={(event) => onChange({ ...step, relation: event.currentTarget.value as typeof step.relation })}><option value="intersects">Intersects</option><option value="within">Within</option></select></label><label>范围<select value={step.mask} onChange={(event) => onChange({ ...step, mask: event.currentTarget.value as typeof step.mask })}><option value="buffer">Buffer</option><option value="aoi">AOI</option></select></label></div>;
    if (step.type === "dissolve") return <div className="workflow-step-editor"><label>融合字段<select value={step.field} onChange={(event) => onChange({ ...step, field: event.currentTarget.value as typeof step.field })}><option value="all">全部</option><option value="landUseType">landUseType</option></select></label></div>;
    if (step.type === "intersection") return <div className="workflow-step-editor"><label>叠加范围<select value={step.overlay} onChange={(event) => onChange({ ...step, overlay: event.currentTarget.value as typeof step.overlay })}><option value="aoi">AOI</option><option value="buffer">Buffer</option></select></label></div>;
    if (step.type === "hexbin") return <div className="workflow-step-editor"><label>权重<select value={step.weightMode} onChange={(event) => onChange({ ...step, weightMode: event.currentTarget.value as typeof step.weightMode })}><option value="count">Count</option><option value="area">Area</option></select></label><label>网格（km）<input type="number" min="0.05" max="100" step="0.25" value={step.cellSizeKm} onChange={(event) => onChange({ ...step, cellSizeKm: Number(event.currentTarget.value) })} /></label></div>;
    return <p className="workflow-editor-note">该步骤没有可配置参数。</p>;
}

function RunSummary({ run, previewFeatureCount, onAddPreviewLayer, onExportPreview, onFitResult, onOpenLayers }: { run: WorkflowRunRecord; previewFeatureCount: number | null; onAddPreviewLayer: () => void; onExportPreview: () => void; onFitResult: (layerId: string) => void; onOpenLayers: () => void }) {
    return <section className={`workflow-run-log ${run.status}`}><header><span>RUN LOG</span><strong>{run.status === "completed" ? "运行完成" : "运行失败"}</strong></header><ol>{run.steps.map((step) => <li key={step.stepId} className={step.status}><span>{step.status === "success" ? "✓" : step.status === "failed" ? "×" : "−"}</span><div><strong>{STEP_LABELS[step.stepType]}</strong><p>{step.message} · {step.inputFeatureCount} → {step.outputFeatureCount}</p></div><time>{step.durationMs.toFixed(1)} ms</time></li>)}</ol><footer><span>输入 {run.inputFeatureCount}</span><span>输出 {run.outputFeatureCount}</span><span>{run.durationMs.toFixed(1)} ms</span></footer>{run.status === "completed" && run.outputLayerId && <div className="workflow-result-actions"><button type="button" onClick={() => onFitResult(run.outputLayerId!)}>定位结果</button><button type="button" onClick={onOpenLayers}>打开图层</button></div>}{run.status === "completed" && !run.outputLayerId && previewFeatureCount !== null && <div className="workflow-result-actions"><button type="button" onClick={onAddPreviewLayer}>添加为分析图层</button><button type="button" onClick={onExportPreview}>导出 GeoJSON</button></div>}</section>;
}
