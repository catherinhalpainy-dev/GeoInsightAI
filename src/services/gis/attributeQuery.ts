import {
    LAND_USE_LABELS,
    LAND_USE_TYPES,
} from "../../constants/landUse";
import type {
    LandUseFeature,
    LandUseFeatureCollection,
} from "../../types/landUse";
import type {
    AttributeQuery,
    QueryCondition,
    QueryField,
    QueryGroup,
    QueryOperator,
} from "../../types/query";

const NUMERIC_FIELDS = new Set<QueryField>([
    "areaM2",
    "builtYear",
]);

const OPERATOR_LABELS: Record<QueryOperator, string> = {
    eq: "=",
    neq: "≠",
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    contains: "包含",
    between: "介于",
};

const FIELD_LABELS: Record<QueryField, string> = {
    id: "要素 ID",
    landUseType: "用地类型",
    areaM2: "面积",
    districtCode: "行政区代码",
    builtYear: "建成年份",
};

export function getAllowedQueryOperators(
    field: QueryField,
): QueryOperator[] {
    if (NUMERIC_FIELDS.has(field)) {
        return ["eq", "neq", "gt", "gte", "lt", "lte", "between"];
    }

    if (field === "landUseType") {
        return ["eq", "neq"];
    }

    return ["eq", "neq", "contains"];
}

function toFiniteNumber(value: string | number) {
    if (typeof value === "string" && value.trim() === "") {
        return null;
    }

    const numericValue = typeof value === "number"
        ? value
        : Number(value);

    return Number.isFinite(numericValue)
        ? numericValue
        : null;
}

function compareNumbers(
    actual: number,
    condition: QueryCondition,
) {
    const first = toFiniteNumber(condition.value);

    if (first === null) {
        return false;
    }

    switch (condition.operator) {
        case "eq": return actual === first;
        case "neq": return actual !== first;
        case "gt": return actual > first;
        case "gte": return actual >= first;
        case "lt": return actual < first;
        case "lte": return actual <= first;
        case "between": {
            const second = condition.value2 === undefined
                ? null
                : toFiniteNumber(condition.value2);

            if (second === null) {
                return false;
            }

            const minimum = Math.min(first, second);
            const maximum = Math.max(first, second);
            return actual >= minimum && actual <= maximum;
        }
        default: return false;
    }
}

function compareStrings(
    actual: string,
    condition: QueryCondition,
) {
    const expected = String(condition.value);

    switch (condition.operator) {
        case "eq": return actual === expected;
        case "neq": return actual !== expected;
        case "contains": return actual
            .toLocaleLowerCase()
            .includes(expected.toLocaleLowerCase());
        default: return false;
    }
}

export function evaluateCondition(
    feature: LandUseFeature,
    condition: QueryCondition,
) {
    if (!getAllowedQueryOperators(condition.field).includes(condition.operator)) {
        return false;
    }

    const actual = feature.properties[condition.field];

    if (NUMERIC_FIELDS.has(condition.field)) {
        return typeof actual === "number" &&
            Number.isFinite(actual) &&
            compareNumbers(actual, condition);
    }

    return typeof actual === "string" &&
        compareStrings(actual, condition);
}

export function evaluateQueryGroup(
    feature: LandUseFeature,
    group: QueryGroup,
) {
    if (group.conditions.length === 0) {
        return true;
    }

    return group.logic === "and"
        ? group.conditions.every((condition) =>
            evaluateCondition(feature, condition),
        )
        : group.conditions.some((condition) =>
            evaluateCondition(feature, condition),
        );
}

export function evaluateAttributeQuery(
    feature: LandUseFeature,
    query: AttributeQuery,
) {
    const groups = query.groups.filter(
        (group) => group.conditions.length > 0,
    );

    if (groups.length === 0) {
        return true;
    }

    return query.logic === "and"
        ? groups.every((group) => evaluateQueryGroup(feature, group))
        : groups.some((group) => evaluateQueryGroup(feature, group));
}

export function filterFeaturesByQuery(
    collection: LandUseFeatureCollection,
    query: AttributeQuery,
): LandUseFeature[] {
    return collection.features.filter(
        (feature) => evaluateAttributeQuery(feature, query),
    );
}

export function validateAttributeQuery(
    query: AttributeQuery,
): string | null {
    const conditions = query.groups.flatMap(
        (group) => group.conditions,
    );

    if (conditions.length === 0) {
        return "请至少添加一个查询条件。";
    }

    for (const condition of conditions) {
        if (!getAllowedQueryOperators(condition.field).includes(condition.operator)) {
            return "当前字段不支持所选运算符。";
        }

        if (NUMERIC_FIELDS.has(condition.field)) {
            if (toFiniteNumber(condition.value) === null) {
                return `${FIELD_LABELS[condition.field]}：请输入有效数字。`;
            }

            if (
                condition.operator === "between" &&
                (
                    condition.value2 === undefined ||
                    toFiniteNumber(condition.value2) === null
                )
            ) {
                return `${FIELD_LABELS[condition.field]}：between 需要两个有效数字。`;
            }
        } else if (String(condition.value).trim() === "") {
            return `${FIELD_LABELS[condition.field]}：请输入查询值。`;
        } else if (
            condition.field === "landUseType" &&
            !LAND_USE_TYPES.some((type) => type === condition.value)
        ) {
            return "用地类型不是支持的枚举值。";
        }
    }

    return null;
}

function formatConditionValue(condition: QueryCondition) {
    const rawValue = condition.field === "landUseType"
        ? LAND_USE_LABELS[String(condition.value) as keyof typeof LAND_USE_LABELS] ?? String(condition.value)
        : String(condition.value);
    const unit = condition.field === "areaM2" ? " m²" : "";

    if (condition.operator === "between") {
        return `${rawValue}${unit} – ${String(condition.value2 ?? "")}${unit}`;
    }

    return `${rawValue}${unit}`;
}

export function summarizeAttributeQuery(
    query: AttributeQuery,
) {
    return query.groups
        .filter((group) => group.conditions.length > 0)
        .map((group) => group.conditions
            .map((condition) =>
                `${FIELD_LABELS[condition.field]} ${OPERATOR_LABELS[condition.operator]} ${formatConditionValue(condition)}`,
            )
            .join(` ${group.logic.toUpperCase()} `),
        )
        .join(` ${query.logic.toUpperCase()} `);
}
