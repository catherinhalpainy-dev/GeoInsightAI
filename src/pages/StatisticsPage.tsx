// 统计数据展示

import { LAND_USE_LABELS } from "../constants/landUse";
import { MockLandUseDataset } from "../data/mockLandUse";
import { filterByLandUseType, filterByMinimumBuiltYear } from "../utils/landUseFilters";
import { calculateLandUseStatistics, sortFeaturesByAreaDescending } from "../utils/landUseStatistics";

const features = MockLandUseDataset.collection.features;
const statistics =
    calculateLandUseStatistics(features);

const recentCommercialFeatures=
    filterByLandUseType(filterByMinimumBuiltYear(features,2010),"commercial");
// const recentCommercialFeatures=
//     filterByLandUseType(features.filter((feature)=>{
//         return(! feature.properties.builtYear? false:feature.properties.builtYear>2010);
//     }),"commercial");

const sortedFeatures=
    sortFeaturesByAreaDescending(features);

export function StatisticsPage() {
    return (
        <section className="page-content">
            <h1>统计分析</h1>
            <ul>
                <li>总要素数：{statistics.featureCount }</li>
                <li>用地类型数：{statistics.typeCount}</li>
                {/* 打出m²：按住alt,打小键盘0178 */}
                <li>总面积：
                    {statistics.totalAreaM2}m²
                </li>
                {/* toFixed：保留小数位数 */}
                <li>平均面积：
                    {statistics.averageAreaM2.toFixed(2)}m²
                </li>
                <li>最大面积类型：
                    {statistics.largestFeature
                    ? LAND_USE_LABELS[
                        statistics.largestFeature.properties.landUseType    
                    ]:"暂无"}
                </li>
                <li>
                    2010年以后商业用地：
                    {recentCommercialFeatures.length}条
                </li>
                <li>原始第一条：
                    {features[0].properties.id}
                </li>
                <li>面积排序第一：
                    {sortedFeatures[0].properties.id}
                </li>
            </ul>
        </section>
    );
}