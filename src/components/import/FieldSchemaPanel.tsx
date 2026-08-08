
const FIELD_SCHEMA = [
  {
    name: "id",
    type: "string",
    required: true,
    description: "唯一要素编号",
  },
  {
    name: "landUseType",
    type: "enum",
    required: true,
    description: "用地分类",
  },
  {
    name: "areaM2",
    type: "number",
    required: true,
    description: "面积（平方米）",
  },
  {
    name: "districtCode",
    type: "string",
    required: true,
    description: "行政区编码",
  },
  {
    name: "builtYear",
    type: "number | null",
    required: false,
    description: "建成年份",
  },
] as const;

export function FieldSchemaPanel() {
  return (
    <div className="field-schema-list">
      {FIELD_SCHEMA.map(
        (field) => {
          return (
            <article
              key={field.name}
              className="field-schema-row"
            >
              <div>
                <strong>
                  {field.name}
                </strong>

                <span>
                  {field.description}
                </span>
              </div>

              <code>
                {field.type}
              </code>

              <span
                className={
                  field.required
                    ? "field-required"
                    : "field-optional"
                }
              >
                {field.required
                  ? "必填"
                  : "可空"}
              </span>
            </article>
          );
        },
      )}
    </div>
  );
}