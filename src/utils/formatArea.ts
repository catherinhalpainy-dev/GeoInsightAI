export interface FormatAreaOptions {
    includeSquareMeters?: boolean;
    hectareThresholdM2?: number;
}

export function formatArea(
    areaM2: number,
    options: FormatAreaOptions = {},
) {
    const safeArea = Number.isFinite(areaM2) ? Math.max(0, areaM2) : 0;
    const threshold = options.hectareThresholdM2 ?? 10_000;
    const squareMeters = `${Math.round(safeArea).toLocaleString("zh-CN")} m²`;

    if (safeArea < threshold) {
        return squareMeters;
    }

    const hectares = `${(safeArea / 10_000).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} ha`;

    return options.includeSquareMeters
        ? `${hectares}（${squareMeters}）`
        : hectares;
}

export function formatAreaKm2(areaM2: number) {
    const safeArea = Number.isFinite(areaM2) ? Math.max(0, areaM2) : 0;
    return `${(safeArea / 1_000_000).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} km²`;
}
