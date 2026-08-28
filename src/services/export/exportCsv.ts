import type {
    LandUseFeature,
} from "../../types/landUse";

type CsvField =
    string | number | null;

function escapeCsvField(
    value: CsvField,
) {
    const text = value === null
        ? ""
        : String(value);

    if (!/[",\r\n]/.test(text)) {
        return text;
    }

    return `"${text.replaceAll('"', '""')}"`;
}

export function createLandUseCsv(
    features: LandUseFeature[],
) {
    const rows: CsvField[][] = [
        [
            "id",
            "landUseType",
            "areaM2",
            "districtCode",
            "builtYear",
        ],
        ...features.map((feature) => {
            const properties = feature.properties;

            return [
                properties.id,
                properties.landUseType,
                properties.areaM2,
                properties.districtCode,
                properties.builtYear,
            ];
        }),
    ];

    return rows
        .map((row) =>
            row.map(escapeCsvField).join(","),
        )
        .join("\r\n");
}

export function downloadLandUseCsv(
    features: LandUseFeature[],
    fileName: string,
) {
    const csv = createLandUseCsv(features);
    const blob = new Blob(
        ["\uFEFF", csv],
        {
            type: "text/csv;charset=utf-8",
        },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
}
