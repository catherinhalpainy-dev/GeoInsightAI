# GeoInsight AI Web 前端真实性能优化报告

## 1. 目标、边界与测试环境

本轮只实施与 Web 前端求职材料直接相关、低风险且可由仓库证据复现的优化，起点为提交 `109c9802a81c3413b644e930324b370816cfe556`。未借性能名义改变业务规则、接口协议、地图视觉或数据结构。

测试环境：Microsoft Windows NT 10.0.26200.0（x64）、Intel64 Family 6 Model 140（8 个逻辑处理器）、Node v24.13.0、npm 11.6.2、Vite 8.1.5。生产包使用 `npm run build`，gzip 使用 .NET `GZipStream` 的 `CompressionLevel.Optimal` 对磁盘上的 minified asset 统一重算。GIS 基准使用 `node:perf_hooks performance.now()`，每个数据量和场景执行 5 次并取中位数。

浏览器自动化运行时返回“无可用浏览器”，所以 `/import`、`/workspace`、`/statistics`、`/report` 的 1920×1080、禁用缓存、各 5 次浏览器测量未能执行。本报告不估算 FCP、LCP、React commit、Long Task、Map Ready 或内存数据。

## 2. 优化前基线

优化前 `npm run build` 与 `npm run lint` 均通过；Vite 转换 2,927 个模块，构建用时 1.76 s。应用只有一个 JS 产物，所有页面、MapLibre、ECharts 和业务功能随首屏静态加载。

| 指标 | 优化前 |
| --- | ---: |
| JS chunk 数 | 1 |
| 首始 JS（raw） | 3,275,359 B |
| 首始 JS（gzip） | 946,982 B |
| 全部 JS（raw） | 3,275,359 B |
| 全部 JS（gzip） | 946,982 B |
| 最大首始 chunk | 3,275,359 B |
| CSS（raw / gzip） | 216,764 B / 33,824 B |
| Vite 大 chunk 告警 | 有 |

原始输出见 `docs/performance/before-build.txt`，结构化数据见 `docs/performance/before-bundle.json`。

## 3. 经代码与构建确认的瓶颈

1. `src/App.tsx` 静态导入四个业务页面，使路由边界无法形成异步 chunk。
2. `src/pages/DataImportPage.tsx` 即使未打开“空间预览”页签，也静态引入 `MapView` 及 MapLibre 依赖。
3. `src/pages/WorkspacePage.tsx` 静态引入 Agent、地理处理、空间统计、工作流、时序对比、数据质量、报告构建等低频面板。
4. `src/components/statistics/Echart.tsx` 使用 `import * as echarts from "echarts"`，把完整 ECharts 运行时纳入图表 chunk；实际图表只使用 Bar、Pie、Grid、Legend、Tooltip 和 CanvasRenderer。
5. `syncAnalysisResultLayers` 每次同步现有 GeoJSON source 都调用 `setData`，即使只是切换图层可见性且 collection 引用未变化，也会触发重复数据提交。
6. Turf 未发现 namespace 整包导入；当前是从 `@turf/turf` 的具名导入，`area`、`buffer` 已使用直接包。缺少 bundle 分析器证据时继续机械改写为更多子包会增加依赖维护和回归成本，因此本轮不改。

## 4. 已实施优化

- 路由级拆包：`DataImportPage`、`WorkspacePage`、`StatisticsPage`、`ReportPage` 改为 `React.lazy` + `Suspense`，并保留可访问的加载状态。
- 空间预览按需加载：导入页只有切换到空间预览页签时才动态加载 `ImportSpatialPreview`，避免 `/import` 默认视图加载 MapLibre。
- 重业务面板按需加载：工作台内 9 个低频面板改为动态导入，分别是 Agent、地理处理、几何编辑、时序配置、空间统计、工作流、时序对比、数据质量和报告构建。
- ECharts 模块化：只注册 BarChart、PieChart、GridComponent、LegendComponent、TooltipComponent 和 CanvasRenderer。拆包后、模块化前的中间构建中 ECharts chunk 为 1,118.93 kB / gzip 371.16 kB；模块化后为 525.95 kB / gzip 177.84 kB。
- 地图 source 差异同步：为分析结果图层保存 collection 引用缓存；source 新建或 collection 引用变化时才调用 `setData`，移除 source 时同步清理缓存。按代码路径计数，N 个既有结果图层仅切换可见性由 N 次 `setData` 降为 0 次；仅替换其中一个 collection 时由 N 次降为 1 次。该项是确定性的调用条件变化，不冒充浏览器耗时测量。

## 5. 构建产物前后对比

最终 `npm run build` 与 `npm run lint` 均通过；Vite 转换 2,921 个模块，构建用时 1.17 s。

| 指标 | 优化前 | 优化后 | 变化 |
| --- | ---: | ---: | ---: |
| 首始 JS（raw） | 3,275,359 B | 361,438 B | -88.96% |
| 首始 JS（gzip） | 946,982 B | 111,482 B | -88.23% |
| 全部 JS（raw） | 3,275,359 B | 2,687,803 B | -17.94% |
| 全部 JS（gzip） | 946,982 B | 771,164 B | -18.57% |
| JS chunk 数 | 1 | 34 | +33（按需加载） |
| 最大首始 JS chunk | 3,275,359 B | 352,404 B | -89.24% |
| CSS（raw） | 216,764 B | 216,775 B | 基本不变 |
| CSS（分 chunk 后 gzip 合计） | 33,824 B | 39,445 B | +5,621 B |

“首始 JS”严格定义为 `dist/index.html` 中的 module script 和 modulepreload：最终为 app shell、JSX runtime 和小型 `landUse` 共享模块。它不等同于具体路由完成渲染所需的全部 JS，也不代表网络实测速率。

仍有三个大于 500 kB 的异步 chunk：`layerStyle` 1,074,313 B、`WorkspacePage` 594,213 B、`Echart` 525,952 B。告警没有被调高阈值掩盖。完整结果见 `docs/performance/after-build.txt` 与 `docs/performance/after-bundle.json`。

## 6. GIS 计算基准

脚本生成固定的 EPSG:4326 Polygon 集合；筛选条件固定，叠加与合并使用筛选后的 141 / 714 / 1,428 个要素，AOI 与质量扫描使用完整集合，buffer 每次处理单个面。下表均为 5 次中位数，单位 ms。

| 场景 | 1k | 5k | 10k |
| --- | ---: | ---: | ---: |
| `JSON.parse` | 2.038 | 9.450 | 47.446 |
| 业务字段校验 | 1.099 | 2.435 | 8.520 |
| 属性筛选 | 0.085 | 0.102 | 0.433 |
| AOI intersects | 5.115 | 9.315 | 44.168 |
| 单要素 500 m buffer | 1.042 | 0.786 | 1.489 |
| intersection | 19.948 | 55.718 | 226.418 |
| 按 landUseType dissolve | 13.245 | 71.831 | 267.869 |
| 数据质量扫描 | 24.537 | 312.006 | 605.681 |

逐次原始数据见 `docs/performance/gis-benchmark.json`，生成脚本为 `scripts/performance/gis-benchmark.ts`。这次没有修改上述纯计算实现，因此这些数值是当前实现的容量基线，不应表述成优化前后加速比例。

## 7. 浏览器、Profiler 与生命周期结果

| 页面/场景 | 计划次数 | 实际次数 | 状态 |
| --- | ---: | ---: | --- |
| `/import` 首次加载 | 5 | 0 | 未取得：无可用浏览器 |
| `/workspace` 首次加载 | 5 | 0 | 未取得：无可用浏览器 |
| `/statistics` 首次加载 | 5 | 0 | 未取得：无可用浏览器 |
| `/report` 首次加载 | 5 | 0 | 未取得：无可用浏览器 |
| React Profiler：导入与筛选 | 5 | 0 | 未取得 |
| React Profiler：地图移动 | 5 | 0 | 未取得 |
| React Profiler：图表与报告 | 5 | 0 | 未取得 |
| 页面/面板连续切换 20 次 | 20 | 0 | 未取得 |

因此没有依据去声称 FCP/LCP、交互延迟、React commit 或内存得到改善；也没有实施 `mousemove` 的 `requestAnimationFrame` 节流和 Context 拆分。这两类改动都按要求等待 Profiler 证据。

## 8. 风险、未实施项与后续优先级

- Worker：5k 的 intersection、dissolve、质量扫描已超过 50 ms，10k 分别达到 226.418、267.869、605.681 ms，具备迁移到 Worker 的量化理由。本轮未实施，因为大 GeoJSON 的 structured clone 成本、任务取消、错误回退和页面卸载清理必须用浏览器验证；在该验证环境缺失时引入 Worker 不符合低风险边界。下一步应优先做质量扫描和地理处理 Worker，并同时测传输成本、Long Task 与取消行为。
- 地图交互：无 Profiler 证据，跳过 `mousemove` 节流；后续只在 commit 或 handler 长任务证实后处理。
- Context：无消费者 commit 对比，跳过 AppContext 拆分，避免增加状态一致性风险。
- 大异步 chunk：MapLibre/Turf 相关 `layerStyle` chunk、工作台和 ECharts 仍超过 500 kB。它们已不属于 app shell，但访问相应功能仍需下载；可在有浏览器和 chunk 可视化数据后继续拆分。
- 六边形网格：合成规则边界数据触发既有“部分代表点未能归属网格”异常，故未把失败样本混入耗时表，也未在性能任务中顺手修改算法。需要独立功能缺陷复现与边界测试。
- 外部 LLM/API：只验证了前端到服务端的 Agent 请求 Schema；没有发出真实模型请求，避免消耗密钥、费用或把网络波动混入本地回归结论。

## 9. 验证、复现命令与简历事实

最终验证结果：TypeScript + Vite 生产构建通过，oxlint 无诊断，`git diff --check` 无空白错误；纯函数回归脚本 10/10 通过，覆盖 GeoJSON 导入、筛选、AOI、buffer、intersection、dissolve、质量扫描、工作流往返、工程往返和 Agent 请求 Schema。图表/地图渲染、浏览器路由切换与真实 API 调用仍需在可用浏览器/服务环境中补验。

复现命令：

```powershell
npm.cmd run build
npm.cmd run lint
npx.cmd tsx .\scripts\performance\gis-benchmark.ts
npx.cmd tsx .\scripts\performance\regression-check.ts
```

可写入简历的三条事实（仅以下三条）：

1. 为 React + Vite 空间分析平台落地路由、空间预览和 9 个低频业务面板的按需加载，使生产构建首始 JS 从 3,275,359 B 降至 361,438 B（-88.96%），首始 gzip 从 946,982 B 降至 111,482 B（-88.23%）。
2. 将 ECharts 从整包引入改为 Bar/Pie 与所需组件、Canvas 渲染器的模块化注册，使独立图表 chunk 从 1,118.93 kB / gzip 371.16 kB 降至 525.95 kB / gzip 177.84 kB。
3. 为 MapLibre 分析结果 GeoJSON source 增加引用级差异同步，使仅切换 N 个结果图层可见性时的 `setData` 调用从 N 次降为 0 次，并用 1k/5k/10k、每档 5 次基准定位出 10k 质量扫描 605.681 ms 的后续 Worker 优化依据。
