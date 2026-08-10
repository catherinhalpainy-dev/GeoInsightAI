import {
  LAND_USE_LABELS,
} from "../constants/landUse";

import type {
  LandUseFilters,
} from "../app/appTypes";

import type {
  DashboardSummary,
  LandUseTypeStatistic,
} from "./statisticsDashboard";


interface CreateReportSummaryInput {
  datasetName: string;

  originalFeatureCount:
    number;

  filteredFeatureCount:
    number;

  filters:
    LandUseFilters;

  summary:
    DashboardSummary;

  typeStatistics:
    LandUseTypeStatistic[];
}


export function createReportSummary({
  datasetName,
  originalFeatureCount,
  filteredFeatureCount,
  filters,
  summary,
  typeStatistics,
}: CreateReportSummaryInput) {

  const activeTypes =
    filters.landUseTypes.map(
      (type) => {
        return (
          LAND_USE_LABELS[type]
        );
      },
    );


  const availableTypes =
    typeStatistics
      .filter(
        (item) => {
          return item.count > 0;
        },
      )
      .map(
        (item) => {
          return item.label;
        },
      );


  const filterDescriptions:
    string[] = [];


  if (
    activeTypes.length > 0
  ) {
    filterDescriptions.push(
      `用地类型为${activeTypes.join(
        "、",
      )}`,
    );
  }


  if (
    filters.minimumBuiltYear !==
    null
  ) {
    filterDescriptions.push(
      `建成年份不早于${filters.minimumBuiltYear}年`,
    );
  }


  if (
    filters.districtCode.trim()
  ) {
    filterDescriptions.push(
      `行政区代码为${filters.districtCode}`,
    );
  }


  const filterText =
    filterDescriptions.length >
    0
      ? filterDescriptions.join(
          "，",
        )
      : "当前未应用额外筛选条件";


  const totalAreaKm2 =
    summary.totalAreaM2 /
    1_000_000;


  return {
    title:
      `${datasetName} 空间分析报告`,

    overview:
      `数据集共包含 ${originalFeatureCount} 个空间要素。当前分析结果包含 ${filteredFeatureCount} 个要素，总面积约 ${totalAreaKm2.toFixed(
        2,
      )} km²，平均单要素面积约 ${Math.round(
        summary.averageAreaM2,
      ).toLocaleString()} m²。`,

    filterText,

    landUseSummary:
      availableTypes.length >
      0
        ? `当前结果涉及 ${availableTypes.join(
            "、",
          )} 等用地类型。`
        : "当前筛选条件下没有匹配的用地要素。",
  };
}