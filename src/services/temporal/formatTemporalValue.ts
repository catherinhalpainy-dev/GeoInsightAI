import type { TemporalFieldType } from "../../types/temporal";

export function formatTemporalValue(
    value: number,
    type: TemporalFieldType,
) {
    if (type === "year") {
        return String(value);
    }

    const date = new Date(value);
    return type === "date"
        ? date.toLocaleDateString("zh-CN")
        : date.toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
}
