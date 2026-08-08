import {
  LAND_USE_LABELS,
} from "../../constants/landUse";

import type {
  LandUseFeature,
} from "../../types/landUse";

interface DatasetPreviewTableProps {
  features:
    readonly LandUseFeature[];
}

export function DatasetPreviewTable({
  features,
}: DatasetPreviewTableProps) {
  const previewFeatures =
    features.slice(0, 8);

  return (
    <div className="import-preview-table-wrapper">
      <table className="import-preview-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用地类型</th>
            <th>面积</th>
            <th>行政区</th>
            <th>建成年份</th>
          </tr>
        </thead>

        <tbody>
          {previewFeatures.map(
            (feature) => {
              const {
                id,
                landUseType,
                areaM2,
                districtCode,
                builtYear,
              } =
                feature.properties;

              return (
                <tr key={id}>
                  <td>{id}</td>

                  <td>
                    {
                      LAND_USE_LABELS[
                        landUseType
                      ]
                    }
                  </td>

                  <td>
                    {areaM2.toLocaleString()}
                    {" m²"}
                  </td>

                  <td>
                    {districtCode}
                  </td>

                  <td>
                    {builtYear ??
                      "—"}
                  </td>
                </tr>
              );
            },
          )}
        </tbody>
      </table>

      {features.length > 8 && (
        <p className="import-preview-hint">
          当前仅预览前 8 条，
          共 {features.length} 条要素
        </p>
      )}
    </div>
  );
}