export type QueryLogic = "and" | "or";

export type QueryField =
    | "id"
    | "landUseType"
    | "areaM2"
    | "districtCode"
    | "builtYear";

export type QueryOperator =
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "between";

export interface QueryCondition {
    id: string;
    field: QueryField;
    operator: QueryOperator;
    value: string | number;
    value2?: string | number;
}

export interface QueryGroup {
    id: string;
    logic: QueryLogic;
    conditions: QueryCondition[];
}

export interface AttributeQuery {
    logic: QueryLogic;
    groups: QueryGroup[];
}
