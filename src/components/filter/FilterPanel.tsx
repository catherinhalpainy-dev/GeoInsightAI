import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAppContext } from "../../app/AppProvider";
import {
    LAND_USE_COLORS,
    LAND_USE_LABELS,
    LAND_USE_TYPES,
} from "../../constants/landUse";
import {
    getAllowedQueryOperators,
    summarizeAttributeQuery,
    validateAttributeQuery,
} from "../../services/gis/attributeQuery";
import type {
    AttributeQuery,
    QueryCondition,
    QueryField,
    QueryLogic,
    QueryOperator,
} from "../../types/query";
import { applyLandUseFilters } from "../../utils/applyLandUseFilters";
import { getUniqueDistrictCodes } from "../../utils/landUseStatistics";

const FIELD_OPTIONS: { value: QueryField; label: string }[] = [
    { value: "id", label: "要素 ID" },
    { value: "landUseType", label: "用地类型" },
    { value: "areaM2", label: "面积" },
    { value: "districtCode", label: "行政区代码" },
    { value: "builtYear", label: "建成年份" },
];

const OPERATOR_LABELS: Record<QueryOperator, string> = {
    eq: "等于 =",
    neq: "不等于 ≠",
    gt: "大于 >",
    gte: "大于等于 ≥",
    lt: "小于 <",
    lte: "小于等于 ≤",
    contains: "包含",
    between: "介于",
};

function createCondition(field: QueryField = "areaM2"): QueryCondition {
    return {
        id: crypto.randomUUID(),
        field,
        operator: getAllowedQueryOperators(field)[0],
        value: field === "landUseType" ? LAND_USE_TYPES[0] : "",
    };
}

function createEmptyQuery(): AttributeQuery {
    return {
        logic: "and",
        groups: [{
            id: crypto.randomUUID(),
            logic: "and",
            conditions: [createCondition()],
        }],
    };
}

export function FilterPanel() {
    const { state, dispatch, filteredFeatures } = useAppContext();
    const [mode, setMode] = useState<"basic" | "advanced">(
        () => state.attributeQuery ? "advanced" : "basic",
    );
    const [draftQuery, setDraftQuery] = useState<AttributeQuery>(
        () => state.attributeQuery ?? createEmptyQuery(),
    );
    const [queryError, setQueryError] = useState<string | null>(null);
    const features = useMemo(
        () => state.dataset?.collection.features ?? [],
        [state.dataset],
    );
    const districtCodes = useMemo(
        () => getUniqueDistrictCodes(features),
        [features],
    );
    const basicFilteredCount = useMemo(
        () => applyLandUseFilters(features, state.filters).length,
        [features, state.filters],
    );
    const hasAnyFilter = state.attributeQuery !== null ||
        state.filters.landUseTypes.length > 0 ||
        state.filters.minimumBuiltYear !== null ||
        state.filters.districtCode !== "";

    useEffect(() => {
        if (state.attributeQuery) {
            setDraftQuery(state.attributeQuery);
        }
    }, [state.attributeQuery]);

    function updateCondition(
        groupId: string,
        conditionId: string,
        update: Partial<QueryCondition>,
    ) {
        setDraftQuery((previous) => ({
            ...previous,
            groups: previous.groups.map((group) =>
                group.id === groupId
                    ? {
                        ...group,
                        conditions: group.conditions.map((condition) =>
                            condition.id === conditionId
                                ? { ...condition, ...update }
                                : condition,
                        ),
                    }
                    : group,
            ),
        }));
        setQueryError(null);
    }

    function removeCondition(groupId: string, conditionId: string) {
        setDraftQuery((previous) => ({
            ...previous,
            groups: previous.groups.map((group) =>
                group.id === groupId
                    ? {
                        ...group,
                        conditions: group.conditions.filter(
                            (condition) => condition.id !== conditionId,
                        ),
                    }
                    : group,
            ).filter((group) => group.conditions.length > 0),
        }));
    }

    function clearAdvancedQuery() {
        dispatch({ type: "CLEAR_ATTRIBUTE_QUERY" });
        setDraftQuery(createEmptyQuery());
        setQueryError(null);
    }

    function applyQuery() {
        const error = validateAttributeQuery(draftQuery);

        if (error) {
            setQueryError(error);
            return;
        }

        dispatch({ type: "SET_ATTRIBUTE_QUERY", payload: draftQuery });
        setQueryError(null);
    }

    return (
        <aside className="filter-panel advanced-filter-panel">
            <header className="filter-panel-header">
                <div>
                    <h2>属性筛选</h2>
                    <p>当前显示 {filteredFeatures.length} / {features.length} 条要素</p>
                </div>
                <button
                    type="button"
                    className="filter-clear-button"
                    disabled={!hasAnyFilter}
                    onClick={() => {
                        dispatch({ type: "CLEAR_FILTERS" });
                        clearAdvancedQuery();
                    }}
                >
                    清除全部
                </button>
            </header>

            <div className="filter-mode-switch" role="tablist">
                <button
                    type="button"
                    className={mode === "basic" ? "is-active" : ""}
                    onClick={() => setMode("basic")}
                >基础筛选</button>
                <button
                    type="button"
                    className={mode === "advanced" ? "is-active" : ""}
                    onClick={() => setMode("advanced")}
                >高级查询</button>
            </div>

            {mode === "basic" ? (
                <>
                    <section className="filter-group">
                        <h3>用地类型</h3>
                        <div className="filter-checkbox-list">
                            {LAND_USE_TYPES.map((type) => (
                                <label key={type} className="filter-checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={state.filters.landUseTypes.includes(type)}
                                        onChange={() => dispatch({
                                            type: "TOGGLE_LAND_USE_TYPE",
                                            payload: type,
                                        })}
                                    />
                                    <span
                                        className="filter-color"
                                        style={{ background: LAND_USE_COLORS[type] }}
                                    />
                                    <span>{LAND_USE_LABELS[type]}</span>
                                </label>
                            ))}
                        </div>
                    </section>
                    <section className="filter-group">
                        <label className="filter-field" htmlFor="minimum-built-year">
                            <span>最小建成年份</span>
                            <input
                                id="minimum-built-year"
                                type="number"
                                placeholder="例如 2010"
                                value={state.filters.minimumBuiltYear ?? ""}
                                onChange={(event) => dispatch({
                                    type: "SET_MINIMUM_BUILT_YEAR",
                                    payload: event.currentTarget.value === ""
                                        ? null
                                        : Number(event.currentTarget.value),
                                })}
                            />
                        </label>
                    </section>
                    <section className="filter-group">
                        <label className="filter-field" htmlFor="district-filter">
                            <span>行政区划</span>
                            <select
                                id="district-filter"
                                value={state.filters.districtCode}
                                onChange={(event) => dispatch({
                                    type: "SET_DISTRICT_CODE",
                                    payload: event.currentTarget.value,
                                })}
                            >
                                <option value="">全部行政区划</option>
                                {districtCodes.map((code) => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </label>
                    </section>
                </>
            ) : (
                <div className="advanced-query-builder">
                    <section className="query-root-control">
                        <span>满足</span>
                        <select
                            value={draftQuery.logic}
                            onChange={(event) => setDraftQuery((previous) => ({
                                ...previous,
                                logic: event.target.value as QueryLogic,
                            }))}
                        >
                            <option value="and">全部条件组 AND</option>
                            <option value="or">任一条件组 OR</option>
                        </select>
                    </section>

                    {draftQuery.groups.map((group, groupIndex) => (
                        <section key={group.id} className="query-condition-group">
                            <header>
                                <span>GROUP {groupIndex + 1}</span>
                                <select
                                    value={group.logic}
                                    onChange={(event) => setDraftQuery((previous) => ({
                                        ...previous,
                                        groups: previous.groups.map((item) =>
                                            item.id === group.id
                                                ? { ...item, logic: event.target.value as QueryLogic }
                                                : item,
                                        ),
                                    }))}
                                >
                                    <option value="and">AND</option>
                                    <option value="or">OR</option>
                                </select>
                            </header>

                            {group.conditions.map((condition, conditionIndex) => (
                                <div key={condition.id} className="query-condition-row">
                                    <span className="query-condition-index">{conditionIndex + 1}</span>
                                    <select
                                        value={condition.field}
                                        aria-label="查询字段"
                                        onChange={(event) => {
                                            const field = event.target.value as QueryField;
                                            updateCondition(group.id, condition.id, {
                                                field,
                                                operator: getAllowedQueryOperators(field)[0],
                                                value: field === "landUseType" ? LAND_USE_TYPES[0] : "",
                                                value2: undefined,
                                            });
                                        }}
                                    >
                                        {FIELD_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={condition.operator}
                                        aria-label="查询运算符"
                                        onChange={(event) => updateCondition(
                                            group.id,
                                            condition.id,
                                            {
                                                operator: event.target.value as QueryOperator,
                                                value2: undefined,
                                            },
                                        )}
                                    >
                                        {getAllowedQueryOperators(condition.field).map((operator) => (
                                            <option key={operator} value={operator}>{OPERATOR_LABELS[operator]}</option>
                                        ))}
                                    </select>
                                    <div className="query-value-fields">
                                        {condition.field === "landUseType" ? (
                                            <select
                                                value={condition.value}
                                                aria-label="查询值"
                                                onChange={(event) => updateCondition(
                                                    group.id,
                                                    condition.id,
                                                    { value: event.target.value },
                                                )}
                                            >
                                                {LAND_USE_TYPES.map((type) => (
                                                    <option key={type} value={type}>{LAND_USE_LABELS[type]}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={condition.field === "areaM2" || condition.field === "builtYear" ? "number" : "text"}
                                                value={condition.value}
                                                placeholder="值"
                                                aria-label="查询值"
                                                onChange={(event) => updateCondition(
                                                    group.id,
                                                    condition.id,
                                                    { value: event.target.value },
                                                )}
                                            />
                                        )}
                                        {condition.operator === "between" && (
                                            <input
                                                type="number"
                                                value={condition.value2 ?? ""}
                                                placeholder="到"
                                                aria-label="查询结束值"
                                                onChange={(event) => updateCondition(
                                                    group.id,
                                                    condition.id,
                                                    { value2: event.target.value },
                                                )}
                                            />
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="query-remove-button"
                                        aria-label="删除条件"
                                        onClick={() => removeCondition(group.id, condition.id)}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="query-add-button"
                                onClick={() => setDraftQuery((previous) => ({
                                    ...previous,
                                    groups: previous.groups.map((item) =>
                                        item.id === group.id
                                            ? { ...item, conditions: [...item.conditions, createCondition()] }
                                            : item,
                                    ),
                                }))}
                            ><Plus size={13} />添加条件</button>
                        </section>
                    ))}

                    <button
                        type="button"
                        className="query-add-group-button"
                        onClick={() => setDraftQuery((previous) => ({
                            ...previous,
                            groups: [...previous.groups, {
                                id: crypto.randomUUID(),
                                logic: "and",
                                conditions: [createCondition()],
                            }],
                        }))}
                    ><Plus size={14} />添加条件组</button>

                    {queryError && <p className="query-error">{queryError}</p>}
                    <div className="query-action-row">
                        <button type="button" onClick={applyQuery}>应用查询</button>
                        <button type="button" onClick={clearAdvancedQuery}>清除</button>
                    </div>

                    {state.attributeQuery && (
                        <section className="query-result-summary">
                            <span>QUERY RESULT</span>
                            <strong>{basicFilteredCount} → {filteredFeatures.length} features</strong>
                            <p>{summarizeAttributeQuery(state.attributeQuery)}</p>
                        </section>
                    )}
                </div>
            )}
        </aside>
    );
}
