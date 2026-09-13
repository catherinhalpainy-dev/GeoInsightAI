import {
  lazy,
  Suspense,
  useRef,
  useState,
  type DragEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  Bot,
  FileBarChart,
  MapPinned,
  Trash2,
} from "lucide-react";

import {
  useAppContext,
} from "../app/AppProvider";

import {
  inspectLandUseDataset,
} from "../app/inspectLandUseDataset";

import {
  LAND_USE_LABELS,
} from "../constants/landUse";

import {
  parseLandUseGeoJson,
} from "../utils/parseLandUseGeoJson";

import "../styles/importWorkbench.css";
import { useProjectContext } from "../project/ProjectProvider";
import { deserializeProject } from "../services/project/projectSerializer";
import {
  createDemoProjectInstance,
  loadDemoProject,
} from "../services/demo/loadDemoProject";

const ImportSpatialPreview = lazy(() =>
  import("../components/import/ImportSpatialPreview").then((module) => ({
    default: module.ImportSpatialPreview,
  })),
);


const MAX_FILE_SIZE_BYTES =
  10 * 1024 * 1024;

type ImportPreviewTab =
  | "data"
  | "fields"
  | "spatial";

const FIELD_SCHEMA = [
  {
    name: "id",
    type: "string",
    required: true,
    description: "唯一要素编号",
  },
  {
    name: "landUseType",
    type: "enum",
    required: true,
    description: "用地分类",
  },
  {
    name: "areaM2",
    type: "number",
    required: true,
    description: "面积（平方米）",
  },
  {
    name: "districtCode",
    type: "string",
    required: true,
    description: "行政区编码",
  },
  {
    name: "builtYear",
    type: "number | null",
    required: false,
    description: "建成年份",
  },
] as const;

export function DataImportPage() {
  const navigate =
    useNavigate();

  const {
    state,
    dispatch,
  } = useAppContext();
  const {
    recentProjects,
    lastProjectId,
    isDirty,
    projectError,
    startNewProject,
    resetProjectForImport,
    activateProject,
    openStoredProject,
    removeStoredProject,
  } = useProjectContext();
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const importSectionRef = useRef<HTMLElement | null>(null);
  const [projectOpenError, setProjectOpenError] =
    useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoLoadError, setDemoLoadError] = useState<string | null>(null);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null,
  );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ImportPreviewTab>(
      "data",
    );

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  const dataset =
    state.dataset;

  const inspection =
    dataset
      ? inspectLandUseDataset(
          dataset,
        )
      : null;

  const isImporting =
    state.importStatus ===
      "reading" ||
    state.importStatus ===
      "validating";

  const canLoadToMap =
    dataset !== null &&
    state.importStatus ===
      "preview";

  const previewFeatures =
    dataset?.collection.features
      .slice(0, 8) ?? [];

  async function processFile(
    file: File,
  ) {
    if (!canReplaceCurrentProject()) {
      return;
    }

    resetProjectForImport();
    setSelectedFile(file);

    if (
      file.size >
      MAX_FILE_SIZE_BYTES
    ) {
      dispatch({
        type: "IMPORT_ERROR",
        payload:
          "当前版本仅支持 10 MB 以内的 GeoJSON 文件",
      });

      return;
    }

    const lowerCaseFileName =
      file.name.toLowerCase();

    const isSupportedExtension =
      lowerCaseFileName.endsWith(
        ".geojson",
      ) ||
      lowerCaseFileName.endsWith(
        ".json",
      );

    if (!isSupportedExtension) {
      dispatch({
        type: "IMPORT_ERROR",
        payload:
          "文件扩展名必须是 .geojson 或 .json",
      });

      return;
    }

    dispatch({
      type: "START_FILE_IMPORT",
    });

    try {
      const text =
        await file.text();

      if (
        text.trim() === ""
      ) {
        dispatch({
          type: "IMPORT_ERROR",
          payload:
            "文件内容为空",
        });

        return;
      }

      dispatch({
        type: "VALIDATE_FILE",
      });

      let parsedValue:
        unknown;

      try {
        parsedValue =
          JSON.parse(text);
      } catch {
        dispatch({
          type: "IMPORT_ERROR",
          payload:
            "文件不是合法 JSON，请检查括号、逗号和引号",
        });

        return;
      }

      const result =
        parseLandUseGeoJson(
          parsedValue,
          file.name,
        );

      if (!result.ok) {
        dispatch({
          type: "IMPORT_ERROR",
          payload:
            result.errors.join(
              "；",
            ),
        });

        return;
      }

      dispatch({
        type: "PREVIEW_DATASET",
        payload: {
          dataset:
            result.dataset,

          warnings:
            result.warnings,
        },
      });

      setActiveTab("data");
    } catch (
      error: unknown
    ) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "读取文件时发生未知错误";

      dispatch({
        type: "IMPORT_ERROR",
        payload:
          errorMessage,
      });
    }
  }

  async function handleOpenDemoProject() {
    if (demoLoading || !canReplaceCurrentProject()) {
      return;
    }

    setDemoLoading(true);
    setDemoLoadError(null);
    setProjectOpenError(null);

    try {
      const template = await loadDemoProject();
      activateProject(createDemoProjectInstance(template));
      navigate("/workspace");
    } catch (error) {
      setDemoLoadError(
        error instanceof Error
          ? `示例项目加载失败：${error.message}`
          : "示例项目加载失败，请稍后重试或使用数据导入功能。",
      );
    } finally {
      setDemoLoading(false);
    }
  }

  function handleLoadToMap() {
    if (!canLoadToMap) {
      return;
    }

    dispatch({
      type: "LOAD_DATASET",
    });

    startNewProject(dataset.name);

    navigate("/workspace");
  }

  function handleClearDataset() {
    if (!canReplaceCurrentProject()) {
      return;
    }

    dispatch({
      type: "CLEAR_DATASET",
    });

    resetProjectForImport();

    setSelectedFile(null);
    setActiveTab("data");
  }

  function canReplaceCurrentProject() {
    return !isDirty || window.confirm(
      "当前工程存在未保存修改。确定放弃修改并打开其他工程？",
    );
  }

  async function handleOpenStoredProject(projectId: string) {
    if (!canReplaceCurrentProject()) {
      return;
    }

    setProjectOpenError(null);

    const project = await openStoredProject(projectId);

    if (!project) {
      setProjectOpenError("无法读取该本地工程。");
      return;
    }

    activateProject(project);
    navigate("/workspace");
  }

  async function handleOpenProjectFile(file: File) {
    if (!canReplaceCurrentProject()) {
      return;
    }

    setProjectOpenError(null);

    try {
      const project = deserializeProject(await file.text());
      activateProject(project);
      navigate("/workspace");
    } catch (error) {
      setProjectOpenError(
        error instanceof Error
          ? error.message
          : "无法打开该工程文件。",
      );
    }
  }

  function handleDrop(
    event:
      DragEvent<HTMLElement>,
  ) {
    event.preventDefault();

    setDragActive(false);

    if (isImporting) {
      return;
    }

    const file =
      event.dataTransfer
        .files[0];

    if (!file) {
      return;
    }

    void processFile(file);
  }

  const selectedFileSize =
    selectedFile
      ? selectedFile.size /
        1024
      : 0;

  return (
    <section className="import-workbench">
      <section className="product-hero" aria-labelledby="product-hero-title">
        <div className="product-hero-content">
          <span className="product-hero-eyebrow">GEOINSIGHT AI · SPATIAL ANALYSIS WORKSPACE</span>
          <h1 id="product-hero-title">GeoInsight AI</h1>
          <h2>AI 驱动的 WebGIS 空间分析工作台</h2>
          <p>
            面向地块空间分析与辅助审查，将空间数据、GIS 分析与受约束的 AI
            计划编排整合到浏览器中。
          </p>

          <div className="product-hero-actions">
            <button
              type="button"
              className="product-demo-button"
              disabled={demoLoading}
              onClick={() => void handleOpenDemoProject()}
            >
              <MapPinned size={17} aria-hidden="true" />
              {demoLoading ? "正在加载示例项目..." : "打开示例项目"}
              {!demoLoading && <ArrowRight size={15} aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="product-import-button"
              onClick={() => importSectionRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })}
            >
              导入空间数据
            </button>
          </div>

          {demoLoadError && (
            <p className="product-demo-error" role="alert">
              {demoLoadError}
            </p>
          )}
        </div>

        <div className="product-hero-scene" aria-hidden="true">
          <div className="product-scene-map">
            <span className="scene-boundary" />
            <span className="scene-planning" />
            <span className="scene-restriction" />
            <span className="scene-road scene-road-one" />
            <span className="scene-road scene-road-two" />
            <span className="scene-water" />
            <span className="scene-target" />
          </div>
          <div className="product-scene-caption">
            <strong>滨江地块开发条件分析</strong>
            <span>目标地块 · 规划用途 · 限制区域 · 周边条件</span>
          </div>
        </div>
      </section>

      <section className="product-capabilities" aria-label="核心能力">
        <article>
          <MapPinned size={20} aria-hidden="true" />
          <div>
            <h2>空间分析</h2>
            <p>在浏览器中完成空间查询、缓冲区、相交分析与指标统计。</p>
          </div>
        </article>
        <article>
          <Bot size={20} aria-hidden="true" />
          <div>
            <h2>GIS Agent</h2>
            <p>使用自然语言生成受约束、可审核的 GIS 分析计划。</p>
          </div>
        </article>
        <article>
          <FileBarChart size={20} aria-hidden="true" />
          <div>
            <h2>分析报告</h2>
            <p>将地图、空间计算结果与分析结论形成可打印报告。</p>
          </div>
        </article>
      </section>

      <header ref={importSectionRef} className="import-workbench-header">
        <div>
          <span className="import-section-eyebrow">DATA IMPORT</span>
          <h2>导入空间数据</h2>

          <p>
            导入城市用地
            Polygon GeoJSON，
            完成结构校验、属性检查和空间预览后加载到地图工作台。
          </p>
        </div>

        <div className="import-supported-types">
          <span>
            GeoJSON · 已支持
          </span>

          <span>CSV · 工作台支持</span>
          <span>Shapefile · 暂未支持</span>
        </div>
      </header>

      <div className="import-workbench-layout">
        <aside className="import-source-panel">
          <div className="import-source-tabs">
            <button
              type="button"
              className="active"
            >
              本地文件
            </button>

            <button
              type="button"
              disabled
            >
              URL
            </button>
          </div>

          <section
            className={
              dragActive
                ? "import-dropzone drag-active"
                : "import-dropzone"
            }
            onDragEnter={(
              event,
            ) => {
              event.preventDefault();

              if (
                !isImporting
              ) {
                setDragActive(
                  true,
                );
              }
            }}
            onDragOver={(
              event,
            ) => {
              event.preventDefault();
            }}
            onDragLeave={(
              event,
            ) => {
              event.preventDefault();

              setDragActive(
                false,
              );
            }}
            onDrop={
              handleDrop
            }
          >
            <div className="import-dropzone-icon">
              ↑
            </div>

            <h2>
              拖拽空间数据到这里
            </h2>

            <p>
              支持 .geojson /
              .json，最大 10 MB
              <br />
              当前要求
              EPSG:4326 Polygon
              FeatureCollection
            </p>

            <label
              htmlFor="land-use-file"
              className={
                isImporting
                  ? "import-select-button disabled"
                  : "import-select-button"
              }
            >
              {isImporting
                ? "正在处理..."
                : "选择 GeoJSON"}
            </label>

            <input
              id="land-use-file"
              className="import-file-input"
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              disabled={
                isImporting
              }
              onChange={(
                event,
              ) => {
                const file =
                  event
                    .currentTarget
                    .files?.[0];

                if (file) {
                  void processFile(
                    file,
                  );
                }

                event.currentTarget
                  .value = "";
              }}
            />
          </section>

          {selectedFile && (
            <article className="import-file-card">
              <div className="import-file-icon">
                GEO
              </div>

              <div className="import-file-info">
                <strong>
                  {
                    selectedFile.name
                  }
                </strong>

                <span>
                  {selectedFileSize <
                  1024
                    ? `${selectedFileSize.toFixed(
                        1,
                      )} KB`
                    : `${(
                        selectedFileSize /
                        1024
                      ).toFixed(
                        2,
                      )} MB`}
                </span>
              </div>

              <span className="import-file-status">
                已选择
              </span>
            </article>
          )}

          <div className="import-format-note">
            <strong>
              数据导入能力
            </strong>

            <div>
              <span>
                GeoJSON 主数据
              </span>

              <b className="supported">
                当前页导入
              </b>
            </div>

            <div>
              <span>
                CSV 点数据
              </span>

              <b className="supported">
                工作台追加
              </b>
            </div>

            <div>
              <span>
                Shapefile
              </span>

              <b>
                暂未支持
              </b>
            </div>
          </div>

          <section className="recent-projects">
            <header>
              <div>
                <span>RECENT PROJECTS</span>
                <h2>最近工程</h2>
              </div>
              <button type="button" onClick={() => projectFileInputRef.current?.click()}>
                打开工程
              </button>
            </header>

            <input
              ref={projectFileInputRef}
              className="project-file-input"
              type="file"
              accept=".geoinsight,application/json"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];

                if (file) {
                  void handleOpenProjectFile(file);
                }

                event.currentTarget.value = "";
              }}
            />

            {lastProjectId && recentProjects.some((project) => project.id === lastProjectId) && (
              <button
                type="button"
                className="continue-project-button"
                onClick={() => void handleOpenStoredProject(lastProjectId)}
              >继续上次工程</button>
            )}

            <div className="recent-project-list">
              {recentProjects.map((project) => (
                <article key={project.id}>
                  <button
                    type="button"
                    className="recent-project-main"
                    onClick={() => void handleOpenStoredProject(project.id)}
                  >
                    <strong>{project.name}</strong>
                    <span>
                      {project.primaryFeatureCount} 主数据 · {project.overlayLayerCount} 矢量 · {project.rasterLayerCount ?? 0} 服务 · {project.analysisLayerCount} 分析
                    </span>
                    <time>{new Date(project.updatedAt).toLocaleString("zh-CN")}</time>
                  </button>
                  <button
                    type="button"
                    className="recent-project-delete"
                    aria-label={`删除本地工程 ${project.name}`}
                    title="删除本地工程"
                    onClick={() => {
                      if (!window.confirm("仅删除浏览器中的本地工程，不会删除你已经导出的 .geoinsight 文件。确定继续？")) {
                        return;
                      }

                      void removeStoredProject(project.id).catch(() => {
                        setProjectOpenError("删除本地工程失败。");
                      });
                    }}
                  >
                    <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </article>
              ))}
              {recentProjects.length === 0 && <p>暂无本地工程记录</p>}
            </div>

            {(projectOpenError || projectError) && (
              <p className="recent-project-error" role="alert">
                {projectOpenError ?? projectError}
              </p>
            )}
          </section>
        </aside>

        <main className="import-main-panel">
          {state.importStatus ===
            "reading" && (
            <div
              className="import-progress"
              role="status"
            >
              正在读取文件内容……
            </div>
          )}

          {state.importStatus ===
            "validating" && (
            <div
              className="import-progress"
              role="status"
            >
              正在校验 GeoJSON
              结构和属性……
            </div>
          )}

          {state.importError && (
            <div
              className="import-error"
              role="alert"
            >
              <strong>
                导入失败
              </strong>

              <p>
                {
                  state.importError
                }
              </p>
            </div>
          )}

          {state.importWarnings
            .length > 0 && (
            <section className="import-warning">
              <h2>
                数据警告
              </h2>

              <p>
                有效要素已保留，
                以下问题需要注意：
              </p>

              <ul>
                {state.importWarnings.map(
                  (
                    warning,
                    index,
                  ) => (
                    <li
                      key={`${index}-${warning}`}
                    >
                      {warning}
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}

          {dataset &&
          inspection ? (
            <>
              <section className="import-dataset-heading">
                <div>
                  <span>
                    当前数据集
                  </span>

                  <h2>
                    {
                      dataset.name
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    handleClearDataset
                  }
                >
                  清除数据
                </button>
              </section>

              <section className="import-overview-section">
                <div className="import-section-heading">
                  <div>
                    <h2>
                      数据概览
                    </h2>

                    <p>
                      已完成基础结构与属性校验
                    </p>
                  </div>
                </div>

                <div className="import-overview-grid">
                  <article>
                    <span>
                      要素数量
                    </span>

                    <strong>
                      {
                        inspection
                          .featureCount
                      }
                    </strong>

                    <small>
                      Polygon
                    </small>
                  </article>

                  <article>
                    <span>
                      坐标系统
                    </span>

                    <strong>
                      {
                        dataset.sourceCrs
                      }
                    </strong>

                    <small>
                      WGS 84
                    </small>
                  </article>

                  <article>
                    <span>
                      属性字段
                    </span>

                    <strong>
                      {
                        inspection
                          .fieldCount
                      }
                    </strong>

                    <small>
                      标准用地字段
                    </small>
                  </article>

                  <article>
                    <span>
                      行政区划
                    </span>

                    <strong>
                      {
                        inspection
                          .districtCount
                      }
                    </strong>

                    <small>
                      districtCode
                    </small>
                  </article>

                  <article>
                    <span>
                      用地类型
                    </span>

                    <strong>
                      {
                        inspection
                          .landUseTypeCount
                      }
                    </strong>

                    <small>
                      分类数量
                    </small>
                  </article>

                  <article>
                    <span>
                      缺失年份
                    </span>

                    <strong>
                      {
                        inspection
                          .missingBuiltYearCount
                      }
                    </strong>

                    <small>
                      builtYear
                    </small>
                  </article>
                </div>
              </section>

              <section className="import-preview-card">
                <div className="import-preview-tabs">
                  <button
                    type="button"
                    className={
                      activeTab ===
                      "data"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setActiveTab(
                        "data",
                      );
                    }}
                  >
                    属性预览
                  </button>

                  <button
                    type="button"
                    className={
                      activeTab ===
                      "fields"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setActiveTab(
                        "fields",
                      );
                    }}
                  >
                    字段结构
                  </button>

                  <button
                    type="button"
                    className={
                      activeTab ===
                      "spatial"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setActiveTab(
                        "spatial",
                      );
                    }}
                  >
                    空间预览
                  </button>
                </div>

                <div className="import-preview-content">
                  {activeTab ===
                    "data" && (
                    <div className="import-preview-table-wrapper">
                      <table className="import-preview-table">
                        <thead>
                          <tr>
                            <th>
                              要素编号
                            </th>

                            <th>
                              用地类型
                            </th>

                            <th>
                              面积（m²）
                            </th>

                            <th>
                              区划代码
                            </th>

                            <th>
                              建成年份
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {previewFeatures.map(
                            (
                              feature,
                            ) => (
                              <tr
                                key={
                                  feature
                                    .properties
                                    .id
                                }
                              >
                                <td>
                                  {
                                    feature
                                      .properties
                                      .id
                                  }
                                </td>

                                <td>
                                  {
                                    LAND_USE_LABELS[
                                      feature
                                        .properties
                                        .landUseType
                                    ]
                                  }
                                </td>

                                <td>
                                  {feature.properties.areaM2.toLocaleString()}
                                </td>

                                <td>
                                  {
                                    feature
                                      .properties
                                      .districtCode
                                  }
                                </td>

                                <td>
                                  {feature
                                    .properties
                                    .builtYear ??
                                    "缺失"}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>

                      <p className="import-preview-hint">
                        当前显示前{" "}
                        {
                          previewFeatures.length
                        }{" "}
                        条，共{" "}
                        {
                          dataset
                            .collection
                            .features
                            .length
                        }{" "}
                        条有效要素
                      </p>
                    </div>
                  )}

                  {activeTab ===
                    "fields" && (
                    <div className="field-schema-list">
                      {FIELD_SCHEMA.map(
                        (
                          field,
                        ) => (
                          <article
                            key={
                              field.name
                            }
                            className="field-schema-row"
                          >
                            <div>
                              <strong>
                                {
                                  field.name
                                }
                              </strong>

                              <span>
                                {
                                  field.description
                                }
                              </span>
                            </div>

                            <code>
                              {
                                field.type
                              }
                            </code>

                            <span
                              className={
                                field.required
                                  ? "field-required"
                                  : "field-optional"
                              }
                            >
                              {field.required
                                ? "必填"
                                : "可空"}
                            </span>
                          </article>
                        ),
                      )}
                    </div>
                  )}

                  {activeTab ===
                    "spatial" && (
                    <Suspense
                      fallback={(
                        <div className="import-spatial-preview" aria-live="polite">
                          正在加载空间预览…
                        </div>
                      )}
                    >
                      <ImportSpatialPreview
                        collection={dataset.collection}
                      />
                    </Suspense>
                  )}
                </div>
              </section>

              <section className="import-quality-strip">
                <div>
                  <span>
                    无效面积
                  </span>

                  <strong>
                    {
                      inspection
                        .invalidAreaCount
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    导入警告
                  </span>

                  <strong>
                    {
                      state
                        .importWarnings
                        .length
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    当前状态
                  </span>

                  <strong>
                    {canLoadToMap
                      ? "可加载"
                      : "已加载"}
                  </strong>
                </div>
              </section>

              <footer className="import-workbench-actions">
                <div>
                  <strong>
                    {canLoadToMap
                      ? "数据已准备完成"
                      : "数据当前不可再次加载"}
                  </strong>

                  <span>
                    {canLoadToMap
                      ? "确认后进入地图工作台继续分析"
                      : "重新导入或清除数据后可重新预览"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={
                    handleLoadToMap
                  }
                  disabled={
                    !canLoadToMap
                  }
                >
                  加载到地图
                </button>
              </footer>
            </>
          ) : (
            <section className="import-empty-workbench">
              <div className="import-empty-icon">
                ◇
              </div>

              <strong>
                尚未选择数据
              </strong>

              <span>
                从左侧选择 GeoJSON
                文件，或加载示例数据后，
                这里会显示质量检查、属性和空间预览。
              </span>
            </section>
          )}
        </main>
      </div>
    </section>
  );
}
