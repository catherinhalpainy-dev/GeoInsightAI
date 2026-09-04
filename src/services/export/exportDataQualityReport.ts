import type {
    DataQualityReport,
} from "../../types/dataQuality";
import {
    createCsv,
    downloadCsv,
    type CsvField,
} from "./exportCsv";

export function createDataQualityReportCsv(
    report: DataQualityReport,
) {
    const rows: CsvField[][] = [
        [
            "severity",
            "code",
            "featureId",
            "featureIndex",
            "message",
            "fixable",
        ],
        ...report.issues.map((issue) => [
            issue.severity,
            issue.code,
            issue.featureId,
            issue.featureIndex,
            issue.message,
            issue.fixable ? "true" : "false",
        ]),
    ];

    return createCsv(rows);
}

export function exportDataQualityReport(
    report: DataQualityReport,
    filename: string,
) {
    downloadCsv(
        createDataQualityReportCsv(report),
        filename,
    );
}
