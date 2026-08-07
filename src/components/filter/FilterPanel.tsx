import { useMemo } from "react";

import { useAppContext } from "../../app/AppProvider";

import {
    LAND_USE_COLORS,
    LAND_USE_LABELS,
    LAND_USE_TYPES,
} from "../../constants/landUse";

import {
    getUniqueDistrictCodes,
} from "../../utils/landUseStatistics";

export function FilterPanel() {
    const {
        state,
        dispatch,
        filteredFeatures,
    } = useAppContext();

    // useMemo：缓存计算结果，避免重复计算
    const districtCodes =
        useMemo(() => {
            const features =
                state.dataset?.collection.features ?? [];

            return getUniqueDistrictCodes(features);
        }, [state.dataset]);

    const totalFeatureCount =
        state.dataset?.collection.features.length ?? 0;

    const hasActiveFilters =
        state.filters.landUseTypes.length > 0 ||
        state.filters.minimumBuiltYear !== null ||
        state.filters.districtCode !== "";

    return (
        <aside className="filter-panel">
            <header className="filter-panel-header">
                <div>
                    <h2>属性筛选</h2>

                    <p>
                        当前显示 {filteredFeatures.length}
                        {" / "}
                        {totalFeatureCount} 条要素
                    </p>
                </div>

                <button
                    type="button"
                    className="filter-clear-button"
                    disabled={!hasActiveFilters}
                    onClick={() => {
                        dispatch({
                            type: "CLEAR_FILTERS",
                        });
                    }}
                >
                    清除筛选
                </button>
            </header>

            <section className="filter-group">
                <h3>用地类型</h3>

                <div className="filter-checkbox-list">
                    {LAND_USE_TYPES.map((type) => {
                        const checked =
                            state.filters.landUseTypes
                                .includes(type);

                        return (
                            <label
                                key={type}
                                className="filter-checkbox-item"
                            >
                                {/* 受控组件：checkbox是否选中，不是由DOM决定，而是由React状态决定 */}
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                        dispatch({
                                            type:
                                                "TOGGLE_LAND_USE_TYPE",
                                            payload: type,
                                        });
                                    }}
                                />

                                <span
                                    className="filter-color"
                                    style={{
                                        background:
                                            LAND_USE_COLORS[type],
                                    }}
                                />

                                <span>
                                    {LAND_USE_LABELS[type]}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </section>

            <section className="filter-group">
                <label
                    className="filter-field"
                    htmlFor="minimum-built-year"
                >
                    <span>最小建成年份</span>

                    <input
                        id="minimum-built-year"
                        type="number"
                        placeholder="例如 2010"
                        value={
                            state.filters.minimumBuiltYear ??
                            ""
                        }
                        onChange={(event) => {
                            const value =
                                event.currentTarget.value;

                            dispatch({
                                type:
                                    "SET_MINIMUM_BUILT_YEAR",

                                payload:
                                    value === ""
                                        ? null
                                        : Number(value),
                            });
                        }}
                    />
                </label>
            </section>

            <section className="filter-group">
                <label
                    className="filter-field"
                    htmlFor="district-filter"
                >
                    <span>行政区划</span>

                    <select
                        id="district-filter"
                        value={
                            state.filters.districtCode
                        }
                        onChange={(event) => {
                            dispatch({
                                type:
                                    "SET_DISTRICT_CODE",
                                payload:
                                    event.currentTarget.value,
                            });
                        }}
                    >
                        <option value="">
                            全部行政区划
                        </option>

                        {districtCodes.map((code) => (
                            <option
                                key={code}
                                value={code}
                            >
                                {code}
                            </option>
                        ))}
                    </select>
                </label>
            </section>
        </aside>
    );
}