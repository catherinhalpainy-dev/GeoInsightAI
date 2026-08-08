import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LAND_USE_LABELS,
} from "../../constants/landUse";

import type {
  LandUseFeature,
  LandUseProperties,
} from "../../types/landUse";

interface FeatureTableProps {
  features:
    readonly LandUseFeature[];
}

type SortKey =
  keyof LandUseProperties;

type SortDirection =
  | "asc"
  | "desc";

const PAGE_SIZE = 8;

export function FeatureTable({
  features,
}: FeatureTableProps) {
  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    sortKey,
    setSortKey,
  ] = useState<SortKey>(
    "areaM2",
  );

  const [
    sortDirection,
    setSortDirection,
  ] =
    useState<SortDirection>(
      "desc",
    );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [features]);

  const searchedFeatures =
    useMemo(() => {
      const keyword =
        searchText
          .trim()
          .toLowerCase();

      if (!keyword) {
        return features;
      }

      return features.filter(
        (feature) => {
          const {
            id,
            landUseType,
            districtCode,
            builtYear,
          } =
            feature.properties;

          const searchableText = [
            id,
            LAND_USE_LABELS[
              landUseType
            ],
            districtCode,
            builtYear ?? "",
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            keyword,
          );
        },
      );
    }, [
      features,
      searchText,
    ]);

  const sortedFeatures =
    useMemo(() => {
      const copiedFeatures = [
        ...searchedFeatures,
      ];

      copiedFeatures.sort(
        (first, second) => {
          const firstValue =
            first.properties[
              sortKey
            ];

          const secondValue =
            second.properties[
              sortKey
            ];

          let result = 0;

          if (
            typeof firstValue ===
              "number" &&
            typeof secondValue ===
              "number"
          ) {
            result =
              firstValue -
              secondValue;
          } else {
            result = String(
              firstValue ?? "",
            ).localeCompare(
              String(
                secondValue ?? "",
              ),
              "zh-CN",
            );
          }

          return sortDirection ===
            "asc"
            ? result
            : -result;
        },
      );

      return copiedFeatures;
    }, [
      searchedFeatures,
      sortKey,
      sortDirection,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        sortedFeatures.length /
          PAGE_SIZE,
      ),
    );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages,
    );

  const pageFeatures =
    useMemo(() => {
      const startIndex =
        (safeCurrentPage - 1) *
        PAGE_SIZE;

      return sortedFeatures.slice(
        startIndex,
        startIndex + PAGE_SIZE,
      );
    }, [
      sortedFeatures,
      safeCurrentPage,
    ]);

  function handleSort(
    nextSortKey: SortKey,
  ) {
    setCurrentPage(1);

    if (
      nextSortKey === sortKey
    ) {
      setSortDirection(
        (previous) => {
          return previous === "asc"
            ? "desc"
            : "asc";
        },
      );

      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  }

  function getSortSymbol(
    key: SortKey,
  ) {
    if (key !== sortKey) {
      return "↕";
    }

    return sortDirection === "asc"
      ? "↑"
      : "↓";
  }

  return (
    <article className="statistics-table-card">
      <header className="statistics-table-header">
        <div>
          <h2>属性数据</h2>

          <p>
            共 {
              sortedFeatures.length
            } 条匹配记录
          </p>
        </div>

        <input
          type="search"
          placeholder="搜索编号、类型、行政区、年份"
          value={searchText}
          onChange={(event) => {
            setSearchText(
              event.currentTarget.value,
            );

            setCurrentPage(1);
          }}
        />
      </header>

      <div className="statistics-table-wrapper">
        <table className="statistics-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  onClick={() => {
                    handleSort("id");
                  }}
                >
                  编号
                  {" "}
                  {getSortSymbol(
                    "id",
                  )}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  onClick={() => {
                    handleSort(
                      "landUseType",
                    );
                  }}
                >
                  用地类型
                  {" "}
                  {getSortSymbol(
                    "landUseType",
                  )}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  onClick={() => {
                    handleSort(
                      "areaM2",
                    );
                  }}
                >
                  面积
                  {" "}
                  {getSortSymbol(
                    "areaM2",
                  )}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  onClick={() => {
                    handleSort(
                      "districtCode",
                    );
                  }}
                >
                  行政区
                  {" "}
                  {getSortSymbol(
                    "districtCode",
                  )}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  onClick={() => {
                    handleSort(
                      "builtYear",
                    );
                  }}
                >
                  建成年份
                  {" "}
                  {getSortSymbol(
                    "builtYear",
                  )}
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {pageFeatures.map(
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
                      <span className="land-use-badge">
                        {
                          LAND_USE_LABELS[
                            landUseType
                          ]
                        }
                      </span>
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

            {pageFeatures.length ===
              0 && (
              <tr>
                <td
                  colSpan={5}
                  className="statistics-table-empty"
                >
                  没有匹配的数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="statistics-pagination">
        <span>
          第 {safeCurrentPage}
          {" / "}
          {totalPages} 页
        </span>

        <div>
          <button
            type="button"
            disabled={
              safeCurrentPage <= 1
            }
            onClick={() => {
              setCurrentPage(
                (previous) => {
                  return Math.max(
                    1,
                    previous - 1,
                  );
                },
              );
            }}
          >
            上一页
          </button>

          <button
            type="button"
            disabled={
              safeCurrentPage >=
              totalPages
            }
            onClick={() => {
              setCurrentPage(
                (previous) => {
                  return Math.min(
                    totalPages,
                    previous + 1,
                  );
                },
              );
            }}
          >
            下一页
          </button>
        </div>
      </footer>
    </article>
  );
}