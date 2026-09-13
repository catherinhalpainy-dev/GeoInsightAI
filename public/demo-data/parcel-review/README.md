# 滨江地块开发条件分析

该目录提供 GeoInsight AI 的地块空间分析与辅助审查示例工程。

## 示例内容

- `demo.geoinsight`：首页“一键打开示例项目”使用的完整工程模板。
- `source/landuse.geojson`：土地利用现状主数据。
- `source/planning.geojson`：规划用途。
- `source/restrictions.geojson`：限制建设区域。
- `source/roads.geojson`：道路。
- `source/water.geojson`：水系。
- `source/administrative-boundary.geojson`：行政区边界。

目标地块 ID：`parcel-target-001`。

目标地块与规划用途、限制建设区域具有真实空间叠加关系，周边 500 米内包含多条道路，并位于滨江中区行政边界内。

本示例数据为产品演示用途的合成空间数据，不代表真实地理现状、规划审批结论或行政边界。

如需重新生成数据，在仓库根目录执行 `npm run demo:generate`。
