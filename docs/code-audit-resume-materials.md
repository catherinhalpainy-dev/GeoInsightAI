# GeoInsight AI 代码事实审计与 Web 前端简历素材

> 审计日期：2026-09-12  
> 依据：当前仓库 `src/`、`server/`、构建配置与实际 `npm run build` / `npm run lint` 结果。README 仅作为目录背景，不作为功能证据。

## 0. 结论先行

这是一个以前端为主要执行端的单页 WebGIS 工作台。用户可导入并校验土地利用 Polygon GeoJSON，在 MapLibre 地图上完成筛选、选取、样式配置、量测、AOI、缓冲、空间查询、几何编辑、空间统计、时序对比、工程持久化和报告快照；Express 后端主要承担 GLM 调用、Agent 规划/审批工作流和 AI 报告洞察。

最适合作为前端简历主线的不是“接入 AI”，而是：

1. React 声明式状态与 MapLibre 命令式实例之间的双向同步；
2. 地图实例、事件、Observer、Source/Layer 的生命周期治理；
3. 数据集、筛选、选择、统计、地图和报告之间的一致性设计；
4. TypeScript 联合类型与 Zod 运行时校验构成的边界约束；
5. 受限 AgentCommand 到确定性前端执行器的隔离链路。

### 实现成熟度总表

| 成熟度 | 当前代码事实 |
|---|---|
| 已真实实现 | 导入校验、筛选、MapLibre 地图、图层/样式、选取/定位/量测、Buffer/AOI/空间处理、统计、编辑、时序对比、数据质量、工程保存、工作流、报告快照、受控 Agent |
| 部分实现 | 主数据只支持土地利用 Polygon；报告的 PDF 是浏览器打印；Agent 响应缺少前端 Zod 校验；主地图加载错误缺统一 UI；ErrorBoundary 已编写但未挂载 |
| 仅有定义/依赖/素材 | Zustand 只有依赖；`AppErrorBoundary` 只有组件定义；`test_data` 只有测试数据而没有测试 runner/用例；这些均不能当成已交付能力 |
| 尚未实现 | WebSocket/SSE 流式响应、Web Worker、点聚类、路由懒加载、自动化测试、完整 strict mode、已验证的性能提升数据 |

### 项目真实定位（不超过 80 字）

面向土地利用 Polygon 数据的 React WebGIS 工作台，在浏览器端完成导入校验、地图交互、筛选统计、空间分析、工程保存与受控 Agent 操作。

---

## 1. 项目整体定位

### 1.1 实际解决的问题

项目把土地利用空间数据从“本地文件/外部图层”转化为可交互、可分析、可保存、可出报告的浏览器工作流，重点解决四类问题：

- 数据进入：主数据 GeoJSON 导入、字段/几何校验、预览；叠加数据支持 GeoJSON、CSV 点、远程 URL、XYZ 与 WMS。
- 地图工作：多类 Source/Layer 管理、显隐与顺序、要素选择、定位、量测、样式和专题渲染。
- GIS 分析：属性筛选、AOI/Buffer 空间查询、相交/融合/中心点、热力图/六边形聚合、时序筛选与对比、数据质量扫描和几何编辑。
- 工作成果：IndexedDB 工程保存/恢复、工作流保存执行、地图快照、确定性报告和可选 AI 洞察。

### 1.2 用户完整使用流程

本地主数据文件  
→ `File.text()` 与 `JSON.parse`  
→ 文件大小/扩展名/FeatureCollection/Polygon/属性校验  
→ 数据、字段、空间预览  
→ dispatch `LOAD_DATASET` 进入工作台  
→ 筛选/选取/样式/量测/AOI/空间分析/编辑  
→ MapLibre 增量同步地图表现  
→ ECharts/表格复用筛选结果生成统计  
→ IndexedDB 自动保存工程，或生成报告快照并打印/保存 PDF。

另一条可选入口是打开 `.geoinsight.json` 工程文件或 IndexedDB 最近工程，经迁移和 Zod 校验后恢复数据、地图视角、筛选、图层和工作区状态。

### 1.3 核心模块归类

| 类别 | 已真实实现的模块 |
|---|---|
| 纯前端工程 | React Router 页面骨架；Context/Reducer；受控面板；导入交互；表格/表单；ECharts；工程持久化；报告 UI；错误态 |
| WebGIS | MapLibre 地图实例与 Source/Layer；GeoJSON；WMS/XYZ；专题图；选取/定位/量测；几何编辑；时序双地图 |
| GIS 计算 | Turf Buffer、Intersects/Within、Intersection、Dissolve、Centroid、面积、数据质量、代表点、Heatmap/Hexbin |
| AI / Agent | GLM Function Calling；Zod 命令校验；LangGraph 人工审批；前端白名单命令执行；AI 报告洞察 |

### 1.4 前端在项目中的作用

前端不是后端结果的简单展示层，而是数据与交互的主要执行端：主数据保存在 React 状态；筛选、统计和多数 GIS 计算在浏览器同步完成；前端持有 MapLibre 实例并负责命令映射；Agent 只返回计划，真正的工作区修改仍由前端确定性执行。后端没有通用 GIS 计算服务，主要是 LLM/Agent API 和生产静态资源服务。

---

## 2. 真实技术栈审计

### 2.1 真实使用

| 技术 | 代码事实 |
|---|---|
| React 19 | 页面、组件、Context、Hooks 与 ErrorBoundary 均有实现 |
| TypeScript 6 | `.ts/.tsx` 全量使用；领域联合类型、泛型、MapLibre/GeoJSON 类型、API 类型 |
| Vite 8 | React 插件、开发代理 `/api -> :8787`、生产构建 |
| React Router 7 | `/import`、`/workspace`、`/statistics`、`/report` 和 404 |
| MapLibre GL 5 | 主地图与时序对比双地图；Source/Layer、事件、视角、样式、截图 |
| GeoJSON | 主数据、Overlay、分析结果、编辑草稿、搜索与质量图层的数据协议 |
| Context | `AppProvider`、`ProjectProvider`、`ReportProvider`、`GlobalSearchProvider` |
| `useReducer` | `AppProvider` 管理主数据导入、筛选、属性查询和要素增删改 |
| `useRef` | Map/ECharts 实例、最新回调与 props、缓存、异步序列号、持久化控制器 |
| `useMemo` | 筛选结果、统计、时序切片、专题分级、选择集、报告输入等派生值 |
| `useCallback` | Project/Search 控制器、空间统计输入解析等稳定函数 |
| Zod | Agent 服务端、工程文件、工作流、报告请求/响应的运行时校验 |
| LangGraph | `StateGraph + MemorySaver + interrupt + Command` 的审批状态机 |
| GLM | OpenAI-compatible SDK 调用智谱；默认 `glm-4.7-flash`，可由环境变量覆盖 |
| Function Calling | `submit_gis_plan` 工具 schema，`tools` + `tool_choice: auto` |
| `fetch` | Agent、报告、远程 GeoJSON；均有 AbortController 超时治理 |
| Turf.js | 缓冲、空间关系、相交、融合、中心点、面积、质量检查、网格聚合等 |
| ECharts 6 | 饼图、平均面积图和报告图表；封装实例初始化/更新/销毁 |
| Papa Parse | CSV 点图层解析与经纬度字段映射 |
| IndexedDB | 工程与最近工程元数据存储 |

### 2.2 安装但未实际使用

| 技术 | 结论 |
|---|---|
| Zustand | `package.json` 已安装，但 `src/`、`server/` 无 import 或调用，不能写入项目技术栈 |

### 2.3 代码中不存在

| 技术/能力 | 结论 |
|---|---|
| Webpack | 无配置，实际构建器是 Vite |
| Axios | 未安装、未调用；HTTP 使用原生 `fetch` |
| WebSocket / SSE | 无 `WebSocket`、`EventSource` 或流式协议；Agent 和报告是普通 POST |
| Web Worker | 无 Worker；Turf 和 GeoJSON 处理运行在主线程 |
| React `memo` | 未使用 `React.memo` / `memo` |
| MapLibre source clustering | 未配置 `cluster`，点 Overlay 不做聚类 |
| 路由级懒加载 | 页面静态 import，无 `lazy` / `Suspense` / dynamic import |

---

## 3. 前端架构与真实数据流

### 3.1 目录职责

- `src/pages/`：4 个业务页和 404；`WorkspacePage.tsx` 是工作台容器与业务编排中心。
- `src/components/map/`：MapLibre 主地图、图例、量测 UI。
- `src/components/workspace/`：工具栏、要素详情/表格、数据源、质量、地理处理、几何编辑、空间统计等业务面板。
- `src/components/layers/`：主图层、Overlay/Raster/分析图层树与样式编辑器。
- `src/components/filter/`：基础筛选和分组高级属性查询。
- `src/components/agent/`：自然语言输入、计划审阅、确认/拒绝、执行日志与撤销。
- `src/components/statistics/`：通用 `EChart` 包装和业务图表/表格。
- `src/services/gis/`：无 React 依赖的 GIS 计算、校验、图层解析与数据源函数。
- `src/services/{project,workflow,report,import}/`：按领域组织序列化、schema、API 和执行器。
- `src/types/`：18 个领域类型文件；主数据、图层、分析、Agent、工程、报告、工作流等分域定义。
- `server/`：Express API、GLM client、Agent schema/planner/graph、报告洞察。

### 3.2 Provider 层

`main.tsx` 的真实嵌套为：

`BrowserRouter`  
→ `AppProvider`（主数据/筛选）  
→ `ProjectProvider`（工程持久化）  
→ `ReportProvider`（报告草稿）  
→ `GlobalSearchProvider`（搜索对话框/索引控制器）  
→ `App`。

这不是单一“大 Context”，而是按数据域做了部分拆分。工作台的大量瞬时交互状态仍集中在 `WorkspacePage`，通过 props 传给 MapView 和各业务面板。

### 3.3 关键数据流

#### 导入链路

用户选择文件  
→ `DataImportPage.processFile`  
→ 大小/扩展名检查  
→ `File.text()` / `JSON.parse`  
→ `parseLandUseGeoJson(unknown)` 类型守卫  
→ `PREVIEW_DATASET`  
→ 预览确认  
→ `LOAD_DATASET`  
→ `/workspace`。

#### 筛选与地图/统计链路

`FilterPanel`  
→ dispatch 基础筛选或 `SET_ATTRIBUTE_QUERY`  
→ `appReducer` 更新唯一筛选配置  
→ `AppProvider.useMemo` 先基础筛选、再高级查询  
→ `filteredFeatures`  
→ `WorkspacePage` 生成时间切片 `temporalCollection`  
→ `MapView` 对主 GeoJSONSource 执行 `setData`  
→ 同一个 `filteredFeatures` 被统计页和报告快照复用。

注意：开启时序筛选时，工作台地图使用 `temporalCollection`，独立 `/statistics` 页面只使用全局 `filteredFeatures`，因此两页在时序条件下并非同一口径。这是当前真实的一致性边界。

#### 样式链路

`LayerStylePanel` / `LayerPanel`  
→ `WorkspacePage.layerStyle`  
→ `graduatedClasses` memo 派生  
→ `thematicLayerStyle`  
→ `MapView` effect  
→ `setPaintProperty / setLayoutProperty`  
→ 地图更新，不重建 Map，也不重建主 Layer。

#### 地图反向链路

MapLibre `click / mousemove / moveend / zoomend / dblclick`  
→ 初始化时注册的稳定 handler  
→ `latest...Ref.current` 读取最新回调与交互模式  
→ Workspace callback / React setter  
→ 详情、选择集、坐标、工程视角和面板更新。

#### 报告链路

工作区状态与 GIS 结果  
→ 请求地图 `render` 后截取 canvas  
→ `createReportSnapshot` 计算确定性 KPI/分类/空间分析摘要  
→ 可选 `createAIReportContext` 只传结构化摘要  
→ `/api/report/insights`  
→ GLM JSON 输出  
→ Zod 响应校验  
→ ReportProvider / ReportPage  
→ 浏览器打印或保存 PDF。

---

## 4. 跨组件状态管理审计

### 4.1 为什么只用逐层 props 不合适

主数据和筛选结果同时被导入页、工作台、图层面板、筛选面板、顶部栏、状态栏和统计页消费，且存在跨路由使用；若完全使用 props，会经过 AppShell 和多层布局做无业务意义的透传。因此该部分使用 Context + Reducer 合理。

但必须如实说明：项目没有把所有状态都放入 Reducer。Workspace 内的样式、选择、Buffer/AOI、分析层、时序、工程快照协调和 Agent 执行状态主要是页面本地 state，再通过 props 下发。也就是说，项目采用“跨页面核心状态用 Context/Reducer，工作区瞬时状态由容器托管”的混合方案。

### 4.2 AppReducer 管理的 6 类状态

1. 主数据集 `dataset`；
2. 导入状态 `importStatus`；
3. 导入错误 `importError`；
4. 导入警告 `importWarnings`；
5. 基础筛选 `filters`；
6. 高级属性查询 `attributeQuery`。

### 4.3 19 个 Reducer Action

- 导入 6 个：`START_FILE_IMPORT`、`VALIDATE_FILE`、`PREVIEW_DATASET`、`LOAD_DATASET`、`IMPORT_ERROR`、`CLEAR_DATASET`。
- 筛选 8 个：`TOGGLE_LAND_USE_TYPE`、`SET_MINIMUM_BUILT_YEAR`、`SET_DISTRICT_CODE`、`CLEAR_FILTERS`、`PATCH_FILTERS`、`REPLACE_FILTERS`、`SET_ATTRIBUTE_QUERY`、`CLEAR_ATTRIBUTE_QUERY`。
- 数据编辑 4 个：`UPDATE_FEATURE_PROPERTIES_BATCH`、`ADD_FEATURE`、`UPDATE_FEATURE_GEOMETRY`、`DELETE_FEATURE`。
- 工程恢复 1 个：`RESTORE_PROJECT_DATA`。

Action 使用可辨识联合，Reducer 分支可按 `action.type` 收窄 payload，证据见 `src/app/appTypes.ts:36` 与 `src/app/appReducer.ts:28`。

### 4.4 谁 dispatch，谁消费

| 模块 | dispatch | 消费状态 |
|---|---:|---|
| DataImportPage | 是 | dataset、importStatus/error/warnings |
| FilterPanel | 是 | dataset、filters、attributeQuery、filteredFeatures |
| WorkspacePage | 是 | 全部核心数据，并下发到地图/分析面板 |
| ProjectProvider | 是 | 恢复工程时写回 dataset/filter/query |
| LayerPanel | 否 | dataset、filteredFeatures |
| StatisticsPage | 否 | dataset、importStatus、filteredFeatures |
| TopBar / StatusBar | 否 | 数据集、导入/筛选计数 |

### 4.5 单一数据源与重复状态

做得好的部分：

- `filteredFeatures` 是基于 dataset/filter/query 的 `useMemo` 派生值，没有再次写入 Reducer；筛选配置有单一来源。
- MapLibre 只是 React 状态的渲染投影；业务数据不写回 MapLibre Source 后再反查。
- StatisticsPage 与常规工作台筛选复用同一 `filteredFeatures` 引用。

存在的重复/镜像状态：

- `selectedFeature` 对象与 `selectedFeatureIds` 数组并存；通过 effect 在 dataset 更新后重新查找对象，存在额外同步成本。
- Buffer/AOI 的命中要素数组和结果摘要同时保存，是为避免重复统计，但必须手动失效；代码在筛选变化后清空依赖结果。
- `layerStyle` 与 `savedLayerStyle` 双份保存，用 `JSON.stringify` 判断未保存修改；数据很小，成本可控。
- `projectMapState` 是 MapLibre camera 的 React 镜像，用于工程保存，属于必要重复。
- MapView 内大量 `latest...Ref` 镜像 props，用于让只注册一次的地图 handler 读取最新状态；它们不是第二业务数据源。
- Agent 执行时建立临时 `executionContext` 和撤销 `snapshot`，用于多命令顺序一致性与回滚，是有目的的短生命周期副本。

### 4.6 Context 性能判断

- `filteredFeatures` 已 memo；ProjectProvider 和 ReportProvider 的 value 已 memo。
- AppProvider 的 `value={{ state, dispatch, filteredFeatures }}` 每次 Provider render 都会新建对象，且 state/dispatch 未拆分 Context。Reducer 任一字段变化会通知所有 AppContext 消费者。
- AppProvider 自身只有 reducer state，因此“无关父组件 render 造成 value 变化”的风险较低；真正问题是任一全局字段变化都会扩大更新范围。
- WorkspacePage 有约 5,506 行并持有大量 state，任何本地状态变化都可能重新执行整个容器函数；没有 `React.memo` 缩小子树更新。

---

## 5. React 与 MapLibre 状态同步

### 5.1 Map 实例位置与初始化

- DOM 容器：`containerRef`。
- 地图实例：`mapRef: useRef<maplibregl.Map | null>`，见 `src/components/map/MapView.tsx:3074`。
- 创建：空依赖 `useEffect` 内 `new maplibregl.Map(...)`，见 `MapView.tsx:3264-3274`。
- Map 不放 React state：它是可变、不可序列化、带事件与 WebGL 资源的命令式对象；放 state 会引入无意义 render 和引用语义问题。
- 普通 rerender 不会重建地图；只有组件真正卸载再挂载才会创建新实例。

### 5.2 React → MapLibre 同步链路

React dataset/filter/time  
→ memo 生成新的 FeatureCollection 引用  
→ MapView collection effect  
→ 已有 source：`GeoJSONSource.setData(collection)`  
→ 没有 source：`ensureLandUseLayers` 先 `getSource/getLayer` 再 `addSource/addLayer`。

React style  
→ MapView style effect  
→ `applyLayerStyle`  
→ `setPaintProperty` 更新 fill/line  
→ `setLayoutProperty` 更新 visibility。

React selected IDs  
→ selection effect  
→ MapLibre `setFilter`，不复制/重建主数据。

React map command（含递增 `requestId`）  
→ command effect  
→ `fitBounds / flyTo / jumpTo`  
→ 命令消费完毕但对象可保留，依靠 requestId 区分重复意图。

### 5.3 MapLibre → React 同步链路

Map click  
→ `queryRenderedFeatures`  
→ 最新 `onFeatureSelect` ref  
→ Workspace selectedFeature / selectedFeatureIds  
→ FeatureInfo、表格和高亮 layer filter。

Map moveend/zoomend  
→ 读取 center/zoom/bearing/pitch  
→ `onViewStateChange`  
→ `projectMapState`  
→ 工程持久化快照。

Map mousemove  
→ `runtimeInfo` React state（经纬度）与 hover `setFilter`  
→ 状态栏/地图提示。

### 5.4 Style 切换

底图变化调用 `map.setStyle`。因为 setStyle 会替换 style 中的业务 Source/Layer，代码监听一次 `style.load`，再按 latest refs 重建主图层、量测、Buffer、AOI、Overlay、Raster、分析、质量、搜索、编辑和选择高亮。该设计避免重建 Map 实例，同时显式恢复业务层。

### 5.5 Source / Layer 创建、更新、删除

- 创建前均使用 `getSource/getLayer` 检查，避免重复 add。
- 主数据更新使用 `setData`；样式使用 paint/layout property；选择/时间使用 MapLibre filter。
- Overlay 维护 collection/style 引用缓存和 order signature，只在引用/属性/顺序变化时执行对应命令。
- Raster 仅在数据源配置变化时删除并重建 source/layer，显隐和透明度走 property 更新。
- 删除动态图层时先 `removeLayer`，再 `removeSource`；分析层、Overlay、Raster 均实现差集清理。
- 主 Map 卸载时直接 `map.remove()` 统一释放剩余 style/WebGL 资源。

---

## 6. 地图实例与资源生命周期治理

### 6.1 已经做好的设计

- 空依赖 effect 保证一次挂载只创建一个 Map。
- 所有长期 map handler 使用具名函数注册，并在 cleanup 中对应 `map.off`。
- `window.mouseup` 与 container `mouseleave` 有对应 removeEventListener。
- `ResizeObserver` 在 cleanup 中 `disconnect()`。
- 卸载调用 `map.remove()` 并把 `mapRef.current` 置空。
- 异步 `load/style.load/render` listener 在 effect cleanup 中解除。
- 地图截图的 4 秒 timeout 会 clear；取消 effect 时也 off render。
- 底图切换复用实例，并在 style.load 后恢复业务图层。
- 时序对比的两个 Map 也分别 off 事件、disconnect Observer、clear timeout、remove map。
- ECharts 组件 disconnect ResizeObserver 并 `chart.dispose()`。
- Agent/报告/远程 GeoJSON/WMS 请求使用 AbortController + clearTimeout。
- 时间轴自动播放使用 `setInterval`，effect cleanup 中 `clearInterval`。

项目没有创建 `Marker` 或 `Popup` 对象，因此不存在这两类对象的回收遗漏；定位/搜索点通过 GeoJSON Source/Layer 实现。

### 6.2 仍然存在的风险

- `mousemove` 每次都 `setRuntimeInfo`，未做 requestAnimationFrame 合并或节流，会造成 MapView 高频 React render。
- 几何编辑拖拽也在 mousemove 中遍历全部吸附候选点、映射坐标数组，同时触发 React callback 和 MapLibre setData，大数据下成本高。
- MapView 约 5,452 行，Source/Layer helper 与 React 生命周期集中在单文件，新增事件时容易破坏注册/清理对称性。
- 主地图没有看到统一 `map.on("error")` 到用户可见错误态；底图加载失败主要依赖 MapLibre 默认行为。时序对比只有超时错误。
- AnalysisResultLayer 同步在任一 analysis array 变化后会对所有已有结果 source 调用 `setData`，没有像 Overlay 那样做 collection 引用缓存。

---

## 7. GIS 功能事实表

| 功能 | 状态 | 技术与核心实现 | 关键代码 | 真实难点 |
|---|---|---|---|---|
| 主 GeoJSON 导入 | 已实现 | File API、JSON.parse、手写 unknown 类型守卫；只接收土地利用 Polygon FeatureCollection | `DataImportPage.tsx:157`；`parseLandUseGeoJson.ts:286` | 运行时数据不可信、逐要素告警、重复 id、坐标范围与闭环 |
| 通用 Overlay 导入 | 已实现 | Point/MultiPoint/Line/MultiLine/Polygon/MultiPolygon；无效 Feature 被过滤 | `services/gis/overlayLayer.ts` | 混合几何类型映射成不同 MapLibre layer |
| CSV 点导入 | 已实现 | Papa Parse、字段别名推断、经纬度范围校验、跳过坏行 | `services/import/csvPointImport.ts` | 表头与坐标映射、部分失败统计 |
| 图层管理 | 已实现 | 主图层、Overlay、Raster、Analysis 分组；显隐、顺序、删除、导出、定位 | `LayerPanel.tsx`；`MapView.tsx:2160` | React 数组顺序与 MapLibre stack 一致性 |
| 样式编辑 | 已实现 | 单色/分类/分级；等距/分位数；主图层与 Overlay paint/layout 增量更新 | `LayerStylePanel.tsx`；`symbology.ts`；`MapView.tsx:496` | 专题表达式、无数据值、避免重建图层 |
| 地图定位 | 已实现 | fit all/current/selected/selection/overlay/quality/search/spatial cell、坐标跳转 | `MapView.tsx:4924` 附近 | 一次性命令与持续状态的区分 |
| 要素选择 | 已实现 | queryRenderedFeatures；单选、多选、全选、反选；setFilter 高亮 | `WorkspacePage.tsx:674`；`MapView.tsx:4924` | 地图事件与 React 选择集一致性 |
| 量测 | 已实现 | Turf length/area；点线面临时 Source/Layer；双击完成 | `hooks/useMeasure.ts`；`utils/measure.ts` | 地图交互模式互斥与临时资源更新 |
| Buffer | 已实现 | `@turf/buffer` 与 `@turf/area`；当前明确拒绝 MultiPolygon buffer 结果 | `services/gis/buffer.ts:11` | 单位、几何失败和结果类型限制 |
| AOI / 空间查询 | 已实现 | 绘制 Polygon；Turf `booleanIntersects/booleanWithin`；命中摘要 | `useAoiSketch.ts`；`spatialQuery.ts:63` | O(n) 几何谓词、筛选失效后的结果清理 |
| 地理处理 | 已实现 | intersection、按全部/类型 dissolve、centroid | `geoprocessing.ts:192/257/337` | 无效几何跳过、输出 geometry 类型与属性保留 |
| 空间统计 | 已实现 | 代表点、MapLibre heatmap、Turf hexGrid、数量/面积权重、均值中心 | `spatialStatistics.ts:231/290` | 多几何归一为代表点、网格聚合和分级 |
| 普通统计 | 已实现 | 同一 filteredFeatures 计算 KPI、分类数/面积/均值；ECharts | `StatisticsPage.tsx:40`；`statisticsDashboard.ts` | 避免保存派生统计状态 |
| 时序分析/对比 | 已实现 | 字段探测、时间切片、统计/变化；双 Map 同步与 swipe | `services/temporal/`；`TemporalMapCompareView.tsx` | 双地图 camera 防循环同步与 style 恢复 |
| 几何编辑 | 已实现 | 新建/移动顶点/吸附/面积重算/删除；撤销重做 30 条 | `geometryEditing.ts`；`useEditHistory.ts` | 命令式拖拽、草稿/提交隔离、依赖分析失效 |
| 数据质量 | 已实现 | 属性、坐标、环、重复、自相交等检查；清洗副本与报告导出 | `services/gis/dataQuality.ts` | 大集合逐要素检查与可解释 issue 定位 |
| 工程持久化 | 已实现 | IndexedDB、2 秒防抖自动保存、版本迁移、Zod 恢复校验 | `ProjectProvider.tsx:67`；`projectSchema.ts` | 保存队列、修订号与页面卸载时快照协调 |
| 工作流 | 已实现 | Zod schema、校验、串行本地执行、步骤耗时/输入输出计数、预览/结果层 | `services/workflow/` | 多步骤上下文与失败短路 |
| 报告生成 | 已实现但有边界 | 确定性快照、地图截图、可选 GLM 洞察、报告页、打印/保存 PDF | `createReportSnapshot.ts`；`ReportPage.tsx:295` | 报告口径冻结、AI 只读摘要、canvas 跨域失败 |

“空间分析”“统计分析”“空间查询”不是后端接口的包装，均是浏览器主线程中的真实计算。

---

## 8. GeoJSON 数据处理

### 8.1 主数据导入约束

- 文件上限 10 MiB，扩展名仅 `.geojson/.json`。
- 根节点必须是非空 `FeatureCollection`；不支持单个根 `Feature`。
- 每条必须是 `Feature`，geometry 必须是 `Polygon`；主数据不支持 MultiPolygon、Point、LineString。
- Position 必须恰好两个有限数值，经度 [-180,180]、纬度 [-90,90]。
- Polygon ring 至少 4 个点并首尾闭合；允许多 ring，但不校验 ring 方向。
- properties 强约束 `id/landUseType/areaM2/districtCode/builtYear`；重复 id 跳过并生成 warning。
- 只要仍有有效 Feature，坏 Feature 不会令整文件失败，而是部分导入并展示 warnings。
- 主导入使用手写类型守卫，不使用 Zod；工程文件恢复、工作流和报告才使用 Zod。

### 8.2 MultiPolygon / Point / LineString 的真实支持范围

- 主土地利用 dataset：只支持 Polygon。
- 通用 Overlay：支持 Point、MultiPoint、LineString、MultiLineString、Polygon、MultiPolygon 和 mixed。
- 空间查询 mask：支持 Polygon/MultiPolygon。
- 地理处理输出：可得到 Point、Polygon 或 MultiPolygon。
- 几何编辑：只编辑无内环的主 Polygon；遇到内环会拒绝进入编辑。

### 8.3 大数据性能成本

- `JSON.parse` 必然一次性创建完整对象；10 MiB 上限降低但未消除主线程阻塞。
- 主 dataset 完整保存在 React reducer state，任一要素编辑会创建新的 features 数组；批量修改遍历全量 features。
- 基础筛选一次 `.filter`，有高级查询时再做一次 `.filter`；时间切片再遍历一次。
- MapView 对筛选/时间后的主集合调用 `setData`，MapLibre 需要重新解析 GeoJSON 并更新渲染数据。
- 代码多为数组/对象浅拷贝；几何处理和数据清洗存在 `structuredClone`，工程导出/项目文件解析存在 JSON stringify/parse。
- 派生结果大量使用 `useMemo`，能避免与依赖无关的重复计算；但依赖引用变化时仍同步执行。
- 没有 Web Worker、虚拟化 GeoJSON、服务端切片、矢量瓦片或 source clustering。

---

## 9. 属性筛选与统计一致性

### 9.1 数据流

基础筛选 UI（类型/最小年份/行政区）或高级查询 UI（字段/操作符/值/AND-OR 组）  
→ reducer 保存筛选配置  
→ AppProvider memo 读取原 dataset  
→ `applyLandUseFilters`  
→ 可选 `filterFeaturesByQuery`  
→ cached `filteredFeatures`  
→ Workspace Map、LayerPanel、StatusBar、StatisticsPage、报告快照。

### 9.2 关键判断

- 筛选完全在前端完成，没有后端查询。
- 基础+高级筛选最多连续遍历两次；时间分析和某些统计还会继续遍历。
- 结果由 `useMemo` 缓存，依赖为 dataset/filter/query；没有把结果保存为另一份 reducer state。
- 普通统计再次遍历 filteredFeatures，但 StatisticsPage 的 summary/typeStatistics 各自 memo；两套函数会分别遍历。
- 地图主 source 接收 filtered/temporal collection；选择高亮使用 MapLibre 原生 filter。
- 属性筛选本身没有使用 MapLibre 原生 filter，因为统计、空间查询、导出和报告也需要过滤后的 JS Feature 数组。
- 时间筛选同时存在 JS 侧 `temporalCollection` 和 MapLibre `setFilter`；地图传入的数据已是时间切片，再 setFilter 一次，存在功能重复但口径一致。

### 9.3 值得强调的状态设计

“筛选条件是状态，筛选结果是 memo 派生值”是正确且可面试展开的设计：减少双数据源和手工同步；地图、统计、导出、报告都从同一派生数组继续流转。

---

## 10. 地图样式编辑

主图层真实支持：

- 图层整体、填充、描边显隐；
- fill color / opacity；
- outline color / width / opacity；
- 单一符号、按 `landUseType` 分类、按 `areaM2/builtYear` 分级；
- 等距/分位数，3–6 级，5 套色带；
- 预设、重置、保存/未保存判断。

Overlay 真实支持：

- opacity；
- fill/line/point color；
- line width、point radius；
- visibility 与顺序。

性能结论：主图层样式变化只调用 `setPaintProperty/setLayoutProperty`，不重新创建 layer。Overlay 还通过上一份 style 引用只更新改变的属性。只有 Raster 数据源 URL/配置变化，或底图 style 被替换时，才合理地重建相关 source/layer。

风险：颜色在 Agent Zod schema 中仅校验为 string，不校验 CSS/MapLibre 颜色语法；非法字符串可能通过模型计划校验，执行时才暴露 MapLibre 样式错误。

---

## 11. Agent / AI 真实实现

### 11.1 模型与调用方式

- SDK：OpenAI Node SDK，但 `baseURL` 指向智谱 OpenAI-compatible API。
- 默认模型：`glm-4.7-flash`；`ZAI_MODEL` 可配置。
- 计划生成：Chat Completions Function Calling，工具名 `submit_gis_plan`。
- 报告洞察：同一模型，`response_format: json_object`，temperature 0.2。
- 非流式：无 SSE/WebSocket/首 token 展示。

### 11.2 真实 LangGraph

`StateGraph` 保存 message/context/plan/status  
→ `create_plan` 调 GLM  
→ `review`  
→ 有修改命令时 `interrupt` 等待用户  
→ resume boolean  
→ approve/reject  
→ END。

`MemorySaver` 以 `thread_id` 保存中断状态，因此人工审批是实际可恢复工作流，不是 UI 假确认。但 checkpointer 只在服务进程内存中，重启后未完成 thread 不持久化。

### 11.3 11 类 AgentCommand

1. `apply_filter`
2. `clear_filters`
3. `update_layer_style`
4. `fit_map_bounds`
5. `navigate_statistics`
6. `create_buffer`
7. `query_buffer`
8. `query_aoi`
9. `run_geoprocessing`
10. `update_symbology`
11. `set_analysis_layer_visibility`

每个 plan 最多 8 条命令。

### 11.4 完整执行链

用户自然语言  
→ 前端构造只含当前数据摘要/筛选/选中/分析层的 AgentContext  
→ POST `/api/agent/start`  
→ 服务端 Zod 校验请求  
→ GLM Function Calling 返回工具参数  
→ JSON.parse  
→ `AgentPlanSchema.safeParse`  
→ 服务端按当前 context 检查 buffer/AOI/分析层 id 等前置条件  
→ 只读计划自动批准；所有 mutation 强制 requiresConfirmation  
→ LangGraph interrupt / 用户批准  
→ 前端 `executeAgentCommand` 顺序执行  
→ 再检查选中项、距离、当前结果等运行时条件  
→ dispatch / local setState / map command  
→ MapView effect 调 MapLibre  
→ 逐步执行日志；首个失败时停止  
→ mutation 前 snapshot 支持一次撤销。

### 11.5 模型输出与真实地图操作之间是否有隔离层

有，而且是该项目最可信的 AI 工程亮点。模型没有 Map 实例、不能调用 MapLibre、不能传任意函数名，也不负责几何计算；它只能产生结构化意图。服务端 schema/前置条件、人工审批、前端 switch 白名单执行器共同形成隔离层。

---

## 12. Agent 安全边界

### 已实现

- 命令白名单由 discriminated union 和 Function Calling JSON schema 同时限制。
- Zod `.strict()` 拒绝额外字段；数值有范围，命令数组最多 8 条。
- 服务端对上下文引用和步骤前置条件做第二轮确定性校验。
- 修改状态的命令即使模型错误标记为无需确认，planner 也会强制 `requiresConfirmation=true`。
- 用户拒绝后 LangGraph 进入 rejected，不调用前端执行器。
- 前端 switch 只实现已知 AgentCommand，并在执行时再次检查当前状态。
- 多命令使用本地 executionContext 顺序传播结果；失败后停止后续命令。
- 可变计划执行前创建快照，可恢复筛选、样式、Buffer、查询与分析层。

### 部分实现 / 风险

- Agent API 响应在前端以 `as AgentStartResponse` 断言，没有像报告响应那样再做客户端 Zod parse；模型计划已在服务端校验，但网络边界的前端运行时校验不完整。
- client `AgentCommand` 类型、server Zod schema、Function Calling JSON schema 是三份手工维护的相似契约，有漂移风险。
- color 仅是 string，缺少颜色格式约束。
- 撤销是最近一次计划级快照，不是任意历史、多用户事务或服务端审计日志。
- `MemorySaver` 非持久化；无会话恢复到数据库。
- 这套边界解决的是“模型输出不能任意改地图”的执行安全，不等于完整的 API 安全；代码中没有认证、授权、限流或多租户隔离。

---

## 13. 组件化与复用

### 真正的公共组件

- `EChart`：统一 ECharts init、setOption、ResizeObserver 和 dispose，可被多个业务图表复用。
- `AppShell`：路由布局壳。
- `MapLegend`：主地图与时序对比复用。
- `AppErrorBoundary`：通用错误边界类，但当前未挂载，属于“已定义未接线”。

### 业务组件

- MapView、LayerPanel、LayerStylePanel、FilterPanel、AgentPanel、ReportBuilderPanel、各 Workspace Panel、统计卡片/图表/表格均是职责明确的业务组件，不应包装成通用组件库。

### 配置驱动

- Workspace toolbar command 常量；
- 底图配置；
- 土地分类颜色/标签；
- 图层样式预设与色带；
- 空间统计配置；
- 工作流 step union/template；
- Agent command schema/tool schema。

### 重复与可维护性问题

- `WorkspacePage.tsx` 约 5,506 行、`MapView.tsx` 约 5,452 行，是两个明显的 God component/module；虽然子面板已拆分，编排器和地图 adapter 仍过大。
- Map Source/Layer 的 ensure/update/clear 模式重复，可进一步抽成 registry/controller hooks。
- Agent 三份契约重复。
- DataImportPage 约 1,228 行，仓库已有 `components/import/*`，但当前页面仍包含大量内联预览 UI，拆分不彻底。

---

## 14. TypeScript 使用质量

### 已确认的优点

- 检索未发现显式 `any`、`as any` 或 `<any>`；外部输入普遍从 `unknown` 开始收窄。
- 主 LandUse GeoJSON 使用明确 Position/Polygon/Feature/FeatureCollection 类型。
- Overlay 使用 `geojson` 包的泛型 `Feature<Geometry, Properties>` 与多几何联合。
- MapLibre Map/GeoJSONSource/FilterSpecification/ExpressionSpecification 等类型被真实使用。
- AppAction、AgentCommand、WorkflowStep、数据源、分析结果大量使用可辨识联合。
- `updateLayerStyle<Key extends keyof LayerStyle>` 保证 key/value 关联。
- Zod schema 用 `z.infer` 生成 server Agent 类型；工程 schema 显式声明 `z.ZodType<GeoInsightProject>` 对齐静态类型。
- 工程/工作流/报告实现了运行时校验和编译期类型的双层约束。
- `npm run build` 中 `tsc -b` 通过，`noUnusedLocals/noUnusedParameters/noFallthroughCasesInSwitch` 开启。

### 边界与问题

- `tsconfig.app.json` 没有显式 `strict: true`；不能声称开启完整 strict mode。
- 主导入的 runtime validation 是手写守卫，不是 Zod；这本身可行，但错误结构和 schema 复用能力较弱。
- Agent client 直接断言 response JSON 类型，前端网络边界不完整。
- client/server Agent 类型重复，无法由一个 schema 自动推导。
- `AppErrorBoundary` 虽有类型完整的实现，但没有在 main/AppShell 挂载，不能声称已提供全局错误兜底。

---

## 15. React 性能审计

### 已实现

- Provider 中对 filteredFeatures 做 memo，避免把派生数据保存成重复状态。
- Workspace 对 temporal collections、统计、选择集、专题分级、质量图层、搜索索引等重计算使用 useMemo。
- ProjectProvider 用 useCallback 和 memo value 稳定跨组件控制器。
- Map/ECharts 实例放 ref，不触发 React render。
- Map 事件使用 latest refs 避免因 callback/prop 变化重复解绑绑定。
- Overlay collection/style 使用引用缓存，避免无变化 setData/property 命令。
- 工程自动保存 2 秒防抖并使用 Promise queue 避免并发写覆盖。

### 可进一步优化

- AppContext 拆为 state/dispatch 或按 dataset/import/filter 分域，降低无关消费者更新。
- 拆分 WorkspacePage 与 MapView，配合 `memo` 和更窄 props，缩小 render 范围。
- `mousemove -> setRuntimeInfo` 使用 requestAnimationFrame 合并；几何吸附可建立空间索引。
- FeatureTable 需要核实/增加虚拟滚动；当前不能声称已虚拟化。
- 主页面静态引入 MapLibre、全量 ECharts、Turf 和所有 route，导致单 bundle 过大；适合做路由/面板懒加载与 ECharts 按需引入。
- 高频 GeoJSON 计算移入 Worker；当前同步计算可能阻塞交互。

实际生产构建基线：

- JS：3,275.35 kB minified，957.51 kB gzip；
- CSS：216.76 kB，34.02 kB gzip；
- Vite 明确报告 chunk 超过 500 kB；
- 当前没有 code splitting。

因此不能把“首屏和 bundle 已优化”写成成果；可以把以上数字作为后续优化前基线。

---

## 16. GIS 性能审计

### 已实现的有效优化

- 主 Layer 不因样式变化重建，只改 paint/layout。
- 单选/多选高亮使用 MapLibre filter，不生成另一份高亮 GeoJSON。
- Source/Layer add 前检查存在性；动态层删除遵守 layer-before-source。
- Overlay 仅在 collection 引用变化时 setData，仅在具体 style 属性变化时 setPaint/setLayout。
- Overlay/Raster 顺序使用 signature，避免每次 render 全量 moveLayer。
- 筛选数组和专题分级使用 useMemo。

### 当前真实成本

- 每次筛选/时间切片变化都会产生新 FeatureCollection 并对主 source `setData`。
- 没有 MapLibre 原生属性 filter 来承担全局筛选；选择这样做是因为 JS 端统计/导出/空间分析需要结果，但大数据时成本高。
- AnalysisResultLayers 同步会对全部现存结果层 setData。
- 空间查询对每个 feature 执行 Turf 谓词；Intersection 对每个 feature 求交；均在主线程。
- Hexbin 为每个代表点用 `grid.features.findIndex(booleanPointInPolygon)` 查网格，近似 O(points × cells)。
- 数据质量扫描、清洗与几何吸附均为同步全量处理。
- Point Overlay 没有 source clustering。
- mousemove 未节流；hover 每次可能 queryRenderedFeatures + setFilter。

真正可以写入简历的已完成优化是“避免地图重建、按属性增量更新、图层缓存/差集清理、选择用 filter”。Worker、clustering、节流、矢量瓦片和性能提升百分比只能作为待验证优化方向。

---

## 17. 资源释放案例

| 资源 | 创建/注册 | 释放 |
|---|---|---|
| 主 Map | `new maplibregl.Map` | `map.remove()` |
| Map events | `map.on` / `map.once` | `map.off` |
| window events | `addEventListener` | `removeEventListener` |
| ResizeObserver | 地图、对比地图、EChart | `disconnect()` |
| ECharts | `echarts.init` | `chart.dispose()` |
| 自动播放 interval | `setInterval` | `clearInterval` |
| 自动保存/截图 timeout | `setTimeout` | effect/finally 中 `clearTimeout` |
| fetch | AbortController signal | timeout abort + finally clear |
| 动态 Map layer/source | `addLayer/addSource` | `removeLayer` 后 `removeSource` |

未发现 WebSocket、SSE、MutationObserver、IntersectionObserver 或 Worker，因此没有对应 close/disconnect/terminate 逻辑。

---

## 18. 错误处理与鲁棒性

### 已实现

- GeoJSON 导入：文件大小、扩展名、空文件、JSON 语法、根结构、geometry、properties、重复 id 和部分失败 warnings。
- 远程数据：URL 协议、凭证参数、网络/离线/CORS、HTTP、JSON、校验、12 秒超时。
- Agent/报告：请求超时、非 2xx 错误、服务端 try/catch、Zod 错误和用户可见 error panel。
- GIS：各操作 try/catch，部分坏 geometry 跳过，无法产生结果时返回明确错误。
- 工程：版本迁移、Zod 校验、IndexedDB transaction 错误、保存队列和 UI 状态。
- 工作流：preflight、逐步骤失败记录、duration/input/output count。
- Map capture：render timeout、canvas/CORS 失败返回可展示错误。
- 多数面板使用局部 error state / `role="alert"`，不是 Toast。

### 部分或未接线

- `AppErrorBoundary` 文件存在但 main/App/AppShell 均未挂载，因此全局 render 错误仍无该 fallback。
- 主 Map 未见统一 map error listener 与加载失败 UI。
- 没有统一 Toast 基础设施，错误反馈分散在页面/面板。
- 没有自动化测试验证错误分支。

---

## 19. 可量化指标

### 19.1 可直接从代码/构建确认

| 指标 | 当前值 |
|---|---:|
| 页面组件 | 5（4 个业务页 + 404） |
| `src/components` TSX 文件 | 44 |
| GIS service 文件 | 12 |
| 类型文件 | 18 |
| AppReducer state 类别 | 6 |
| AppAction | 19 |
| AgentCommand | 11 |
| 单个 Agent plan 命令上限 | 8 |
| 编辑历史默认上限 | 30 |
| 主数据文件上限 | 10 MiB |
| 自动保存延迟 | 2,000 ms |
| Agent/报告请求超时 | 30,000 ms |
| 主 Map 截图超时 | 4,000 ms |
| WorkspacePage 行数 | 约 5,506 |
| MapView 行数 | 约 5,452 |
| 生产 JS | 3,275.35 kB / gzip 957.51 kB |
| 生产 CSS | 216.76 kB / gzip 34.02 kB |
| TypeScript build | 通过 |
| oxlint | 通过 |
| 自动化测试脚本/用例 | 0 |

### 19.2 适合后续实测，当前不能填数字

- 首屏 FCP/LCP/INP、主线程 Long Task；
- Map 首次可交互和 style.load 时间；
- 1k/5k/10k Feature 导入、筛选、setData、空间查询时间；
- mousemove 下 MapView commit 次数；
- 路由 code splitting 前后 JS gzip；
- Agent request→plan、approval→last command 的时间；当前非流式，不能测“首 token UI 响应”；
- IndexedDB 保存不同数据量的耗时与失败率。

---

## 20. 可重复测试方案

原则：固定浏览器版本、关闭扩展、使用无痕窗口；每个场景冷启动 5 次，取中位数，同时记录原始 5 次数据。热操作另建一组，不与冷启动混合。

### A. 首屏与 Bundle

1. `npm run build && npm run preview`；Chrome Network 设 Disable cache。
2. 对 `/import`、直接 `/workspace` 各录制 5 次 Performance。
3. 记录 FCP、LCP、INP、JS parse/evaluate、Long Tasks、请求数与 transferred bytes。
4. 用 Coverage 确认首屏未使用的 MapLibre/ECharts/Turf 代码比例。
5. 优化后保持相同设备/限速参数复测，比较中位数与 p95（有更多样本时）。

### B. 地图与 GeoJSON

准备 1k、5k、10k 个合法 Polygon 的固定数据集，并保存 hash。

1. 在 `processFile` 前后、parser 前后加 User Timing mark；记录 JSON.parse、validation、preview 时间。
2. MapView 初始化前打 mark，在 `load` 和业务 source 首次可查询后 measure。
3. 对每个数据量执行 5 次：导入、进入地图、底图切换、图层显隐、样式颜色、分类→分级。
4. Performance 面板检查 setData 后 worker/main-thread 时间、帧率、Long Task。
5. 统计是否重复 addSource/addLayer；可在测试环境包装 Map API 计数。

### C. 筛选、统计与空间分析

每次从同一工程恢复，按固定脚本执行：

1. 类型筛选；
2. 年份筛选；
3. 2 组 × 3 条件高级查询；
4. 500 m Buffer + intersects；
5. 固定 AOI intersects/within；
6. intersection、dissolve、centroid、heatmap、hexbin。

为 `applyLandUseFilters`、`filterFeaturesByQuery`、Turf 操作和 `source.setData` 分别加 performance mark。核对 UI count、地图可见 id、导出 id、统计 count 四者一致。

### D. React render

1. React Profiler 分别录制空闲 mousemove 10 秒、拖动地图 10 秒、修改一次样式、应用一次筛选。
2. 记录 WorkspacePage、MapView、LayerPanel、FilterPanel、Statistics 组件 commit 次数和总耗时。
3. 重点验证 mousemove 是否形成每帧/多帧 commit，以及 Context 变化影响多少消费者。
4. 优化后使用同一动作回放，比较 5 次中位数。

### E. Agent

固定 prompt 和固定 AgentContext JSON，分别测试只读、单 mutation、多 command、非法前置条件、用户拒绝。

记录：

- submit→`/start` response；
- response→计划 UI；
- approve→`/resume` response；
- 前端第 1/最后 command 完成；
- 执行事件数、失败 step、工作区最终状态 hash。

每种 5 次取中位数。因为当前是非流式 Chat Completions，只测“完整 plan 响应”，不伪称首 token。

### F. 生命周期与泄漏

1. 在 `/workspace` 与 `/import` 间往返 20 次；记录 Map 实例创建/`remove` 次数必须相等。
2. 切换底图 20 次，检查业务 source/layer 每个 id 始终只有一份。
3. 打开/关闭时序对比 20 次，验证双 Map 均 remove。
4. 用 Chrome Memory 比较 GC 后 heap、WebGL context、event listener、ResizeObserver 数量。
5. Agent/远程导入请求中途卸载，验证 Abort/timeout 不产生卸载后状态警告。

---

## 21. 简历素材输出

### A. 项目真实概述（80–120 字）

基于 React、TypeScript 和 MapLibre 构建土地利用 WebGIS 工作台，实现 GeoJSON 导入校验、图层样式、属性及空间查询、统计分析与工程保存，并以受限 AgentCommand 执行经审批的地图操作。

### B. 前端架构图

用户文件 / 工程文件 / 自然语言  
→ React Router 页面层  
→ App / Project / Report / Search Context  
→ Reducer 核心数据 + Workspace 容器状态  
→ memo 派生筛选、时序、统计和专题配置  
→ GIS services（Turf / validation / serializer）  
→ MapView imperative adapter  
→ MapLibre Source / Layer / Event / Camera  
→ 地图视图、业务面板、ECharts、报告。

Agent 支线：

自然语言  
→ fetch  
→ Express + GLM Function Calling  
→ Zod AgentPlan  
→ LangGraph interrupt 审批  
→ 前端白名单执行器  
→ Reducer / Workspace state / Map command。

### C. 已确认的技术亮点

#### 亮点 1：声明式 React 与命令式 MapLibre 同步

技术问题：React 用不可变状态描述 UI，MapLibre Map/Source/Layer 是带生命周期的可变对象。  
为什么产生：把 Map 放 state 或随 render 创建会重复实例化、重复绑定事件和丢失 WebGL 资源。  
实现方式：Map 用 ref 持有并仅初始化一次；用独立 effect 把 collection/style/selection/command 映射到 setData、setPaint、setLayout、setFilter 和 fitBounds；长期事件通过 latest refs 读取最新回调。  
关键代码：`MapView.tsx:3074`、`:3264`、`:3896`、`:4603`。  
解决了什么：避免 React rerender 重建地图，并保持数据、样式、选择与地图视图同步。  
可以量化什么：Map 创建/销毁次数、重复 source/layer 数、样式更新命令数、React commit 数。

#### 亮点 2：地图生命周期和动态资源差集治理

技术问题：多图层、多事件和底图 setStyle 容易造成重复 layer、事件泄漏与业务图层丢失。  
为什么产生：MapLibre 资源需按命令顺序管理，setStyle 又会替换 style 图层。  
实现方式：所有 add 前 get 检查；动态层做 desired/current 差集并先 removeLayer 后 removeSource；底图 style.load 后从 latest refs 恢复所有业务层；cleanup 对称 off/disconnect/remove。  
关键代码：`MapView.tsx:1644`、`:2160`、`:2635`、`:3740-3884`。  
解决了什么：保证普通 render、图层增删和底图切换下的资源稳定。  
可以量化什么：20 次路由往返后的 Map/WebGL/Event 数、20 次底图切换后的 source/layer 唯一性。

#### 亮点 3：筛选派生值作为跨模块统一输入

技术问题：地图、统计、空间查询、导出和报告都需要同一筛选口径，重复保存结果会产生状态漂移。  
为什么产生：筛选条件和结果被多个路由/面板消费。  
实现方式：Reducer 只保存 dataset/filter/query，Provider 用 useMemo 派生 filteredFeatures，各模块复用同一结果。  
关键代码：`AppProvider.tsx:40-77`、`FilterPanel.tsx:65`、`StatisticsPage.tsx:40`。  
解决了什么：减少重复 state 和手动同步，筛选变化可自动传播。  
可以量化什么：Reducer 6 类 state、19 类 action、筛选前后 feature count、重复计算次数。

#### 亮点 4：Overlay 的引用级增量同步

技术问题：通用 Point/Line/Polygon Overlay 同时变化时，粗暴重建会增加 MapLibre 布局和数据解析成本。  
为什么产生：图层数据、样式、显隐和顺序是不同频率的变化维度。  
实现方式：collection/style/order 分别缓存；仅 collection 引用变化时 setData，仅变化的 paint/layout 属性才更新，仅结构或顺序签名变化时 moveLayer。  
关键代码：`MapView.tsx:2160-2500`。  
解决了什么：避免无变化 source 重载和全量 layer 重建。  
可以量化什么：一次 opacity 修改前后的 setData/addLayer/moveLayer 调用数。

#### 亮点 5：TypeScript + Zod 的不可信边界

技术问题：文件、网络、LLM 输出只有静态类型无法保证运行时正确。  
为什么产生：外部 JSON 可缺字段、越界或带未知命令。  
实现方式：外部值从 unknown 开始；主 GeoJSON 用类型守卫；工程/工作流/报告/Agent 用 Zod；Reducer/Agent/Workflow 使用可辨识联合。  
关键代码：`parseLandUseGeoJson.ts:286`、`projectSchema.ts`、`workflowSchema.ts`、`server/agent/schemas.ts:112`。  
解决了什么：在数据进入 React/MapLibre/执行器前拒绝非法结构。  
可以量化什么：19 AppAction、11 AgentCommand、每 plan 最多 8 command、各 schema 失败用例通过率。

#### 亮点 6：受控 AgentCommand 执行隔离

技术问题：LLM 输出不稳定，不能直接获得地图实例或任意修改权限。  
为什么产生：模型可能生成不存在的 layer id、越界距离、错误步骤顺序或任意文本。  
实现方式：Function Calling 限定 schema；Zod strict parse；服务端前置条件；mutation 强制 LangGraph 人工确认；前端 switch 再校验并确定性执行；失败短路并提供快照撤销。  
关键代码：`planner.ts:160-238`、`graph.ts:53-175`、`WorkspacePage.tsx:4371-4799`。  
解决了什么：把模型的“建议权”与前端的“执行权”隔离。  
可以量化什么：11 类命令、8 条计划上限、执行成功/失败 step、撤销前后状态 hash。

#### 亮点 7：工程持久化的一致性控制

技术问题：大工作区自动保存可能并发覆盖，页面切换又可能丢失尚未注册的控制器状态。  
为什么产生：IndexedDB 异步事务与 React 状态修订速度不同。  
实现方式：2 秒防抖、revision/session/id 校验、Promise save queue、controller ref、卸载快照和 Zod 恢复校验。  
关键代码：`ProjectProvider.tsx:67-568`。  
解决了什么：串行化保存并避免旧保存结果覆盖新会话 UI 状态。  
可以量化什么：连续编辑下实际 IndexedDB 写次数、保存队列顺序、恢复数据 hash。

#### 亮点 8：浏览器端 GIS 工作流与可观测执行结果

技术问题：多步筛选/空间处理需要传播中间 FeatureCollection，并明确失败位置。  
为什么产生：不同 step 对输入 geometry 和前置结果要求不同。  
实现方式：Zod workflow schema、preflight、串行 context、失败短路、每步 duration/input/output count、预览或结果层输出；Agent plan 可转换为受支持的 workflow step。  
关键代码：`services/workflow/workflowExecutor.ts`、`workflowValidator.ts`、`agentPlanToWorkflow.ts`。  
解决了什么：让多步 GIS 操作可保存、复用、审阅和定位失败。  
可以量化什么：step 数、每步耗时、输入/输出 feature 数、失败 step。

### D. 最值得写入简历的 8 个候选点评分

评分公式：前端含量 40% + 可展开性 25% + 差异化 20% + 可量化 15%，各维度满分 10。

| 排名 | 候选点 | 前端 | 展开 | 差异 | 量化 | 加权分 |
|---:|---|---:|---:|---:|---:|---:|
| 1 | React ↔ MapLibre 双向同步与命令 adapter | 10 | 10 | 9 | 8 | 9.45 |
| 2 | Map/事件/Observer/Source/Layer 生命周期治理 | 10 | 10 | 9 | 8 | 9.45 |
| 3 | Overlay 数据/样式/顺序分维度增量同步 | 10 | 9 | 9 | 9 | 9.40 |
| 4 | Context + Reducer + memo 派生筛选结果 | 10 | 9 | 7 | 8 | 8.85 |
| 5 | TypeScript 联合类型 + Zod 不可信边界 | 9 | 9 | 8 | 8 | 8.65 |
| 6 | 受限 AgentCommand、人工审批与确定性执行/撤销 | 8 | 10 | 10 | 8 | 8.90 |
| 7 | IndexedDB 自动保存的 revision/session/save queue | 9 | 9 | 8 | 8 | 8.65 |
| 8 | 多步浏览器 GIS workflow 与步骤级观测 | 8 | 9 | 9 | 9 | 8.65 |

### E. 最终推荐保留的 4 个核心点

1. React ↔ MapLibre 双向同步：ref 持有实例、effect 映射状态、latest refs 稳定事件、command requestId 表达一次性意图。
2. MapLibre 生命周期与增量图层治理：事件/Observer/remove 对称清理，动态层差集，setStyle 后恢复，paint/layout/filter 局部更新。
3. Context + Reducer + memo 的跨模块数据一致性：条件为 state、结果为派生值，统一驱动地图、统计、空间分析、导出和报告。
4. AgentCommand 安全执行链：GLM 只生成结构化计划，Zod/前置条件/LangGraph 审批/前端白名单执行器隔离模型与地图。

前三项是纯前端/WebGIS 工程主线，Agent 只占一项。

### F. 不应该写进简历的内容

- Zustand：只有依赖，没有使用。
- Axios、Webpack、WebSocket、SSE、Web Worker、source clustering：代码中不存在。
- “实现流式 Agent 首 token”：当前为非流式 POST。
- “全局 ErrorBoundary”：组件存在但没有挂载。
- “完成首屏/Bundle 优化”：当前单 JS gzip 957.51 kB 且有大 chunk 警告。
- “大 GeoJSON 已通过 Worker 优化”：未实现。
- “Map mousemove 已节流”：未实现。
- “点图层聚类”：未实现。
- “完整支持所有 GeoJSON”：主数据只支持土地利用 Polygon；通用 Overlay 才支持多几何。
- “主数据使用 Zod 校验”：主导入使用手写守卫。
- “AI 直接执行 GIS”：模型只规划，前端执行。
- “Agent 前后端共享单一 schema”：目前是多份契约。
- “支持多级 Agent 历史撤销”：当前是最近计划的一次快照撤销。
- “具备自动化测试体系”：没有 test script/用例。
- 任何性能提升百分比、承载 Feature 上限、首屏时间：尚未按测试方案实测。

### G. 面试官最可能追问的 15 个问题（不含答案）

1. 为什么 MapLibre Map 实例要放在 useRef，而不是 useState？
2. React rerender 时如何保证地图不被重复创建、事件不被重复绑定？
3. 为什么地图事件 handler 要通过 latest refs 读取最新 props，而不是把所有回调放进初始化 effect 依赖？
4. 切换底图调用 setStyle 后业务 Source/Layer 为什么会消失，你如何恢复？
5. 动态 Overlay 如何判断应该 add、setData、setPaintProperty、moveLayer 或 remove？
6. 为什么属性筛选没有完全交给 MapLibre 原生 filter？
7. filteredFeatures 为什么是 memo 派生值而不是 reducer 中的另一份 state？
8. AppContext 当前可能引起哪些大范围 rerender，如何验证和拆分？
9. selectedFeature 与 selectedFeatureIds 为什么并存，如何避免它们与 dataset 漂移？
10. 10 MiB GeoJSON 的 JSON.parse、filter、Turf 计算和 setData 分别可能产生什么主线程成本？
11. 如果引入 Web Worker，哪些数据需要传输，如何避免 structured clone 成本抵消收益？
12. TypeScript 静态类型、手写 type guard 和 Zod runtime schema 在项目中各负责哪条边界？
13. LLM 生成的命令如何被限制，为什么它不能直接调用 MapLibre？
14. LangGraph 的 interrupt/MemorySaver 在批准、拒绝和服务器重启时分别会发生什么？
15. 你会如何用 Performance、React Profiler 和 Map API 计数证明一次优化确实有效？

---

## 22. 验证结果与证据索引

- `npm run build`：通过；Vite 8.1.5，2927 modules transformed；记录了上述 bundle 基线与大 chunk 警告。
- `npm run lint`：通过，无 oxlint 输出。
- Git 工作区在审计前为 clean；本文档是本次唯一新增文件。
- 核心证据：
  - `src/app/AppProvider.tsx:38-80`
  - `src/app/appTypes.ts:24-138`
  - `src/app/appReducer.ts:28-250`
  - `src/pages/WorkspacePage.tsx:298-5506`
  - `src/components/map/MapView.tsx:496-4965`
  - `src/utils/parseLandUseGeoJson.ts:286-370`
  - `src/services/gis/*`
  - `src/services/project/*`
  - `src/services/workflow/*`
  - `server/agent/schemas.ts:112-200`
  - `server/agent/planner.ts:160-238`
  - `server/agent/graph.ts:22-290`
