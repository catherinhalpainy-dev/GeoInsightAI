import {
    Database,
    FileSpreadsheet,
    Globe2,
    Layers3,
    RadioTower,
    X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
    analyzeCsvCoordinates,
    createCsvPointLayer,
    parseCsvPointFile,
    type CsvPointImportDocument,
} from "../../services/import/csvPointImport";
import { fetchRemoteGeoJson } from "../../services/import/remoteGeoJson";
import {
    createWmsRasterLayer,
    createXyzRasterLayer,
    validateXyzTileTemplate,
} from "../../services/gis/rasterLayer";
import { testWmsService } from "../../services/gis/wms";
import type {
    WorkspaceRasterLayer,
    WorkspaceVectorLayer,
} from "../../types/mapLayer";
import "../../styles/dataSourcePanel.css";

type DataSourceType = "csv" | "geojson-url" | "xyz" | "wms";
type OperationStatus = "idle" | "loading" | "ready" | "error";

interface DataSourcePanelProps {
    overlayLayerCount: number;
    rasterLayers: readonly WorkspaceRasterLayer[];
    onAddVectorLayer: (layer: WorkspaceVectorLayer) => void;
    onAddRasterLayer: (layer: WorkspaceRasterLayer) => void;
    onClose: () => void;
}

const SOURCE_TYPES: readonly {
    id: DataSourceType;
    label: string;
    detail: string;
}[] = [
    { id: "csv", label: "CSV", detail: "点数据" },
    { id: "geojson-url", label: "GeoJSON URL", detail: "远程矢量" },
    { id: "xyz", label: "XYZ", detail: "栅格瓦片" },
    { id: "wms", label: "WMS", detail: "地图服务" },
];

function StatusMessage({
    status,
    message,
}: {
    status: OperationStatus;
    message: string | null;
}) {
    if (!message) {
        return null;
    }

    return (
        <p className={`data-source-status ${status}`} role={status === "error" ? "alert" : undefined}>
            {message}
        </p>
    );
}

export function DataSourcePanel({
    overlayLayerCount,
    rasterLayers,
    onAddVectorLayer,
    onAddRasterLayer,
    onClose,
}: DataSourcePanelProps) {
    const [sourceType, setSourceType] = useState<DataSourceType>("csv");
    const csvInputRef = useRef<HTMLInputElement | null>(null);
    const [csvStatus, setCsvStatus] = useState<OperationStatus>("idle");
    const [csvMessage, setCsvMessage] = useState<string | null>(null);
    const [csvDocument, setCsvDocument] = useState<CsvPointImportDocument | null>(null);
    const [csvLongitudeField, setCsvLongitudeField] = useState("");
    const [csvLatitudeField, setCsvLatitudeField] = useState("");
    const [csvLayerName, setCsvLayerName] = useState("");

    const [remoteUrl, setRemoteUrl] = useState("");
    const [remoteName, setRemoteName] = useState("");
    const [remoteStatus, setRemoteStatus] = useState<OperationStatus>("idle");
    const [remoteMessage, setRemoteMessage] = useState<string | null>(null);
    const [testedRemoteLayer, setTestedRemoteLayer] = useState<WorkspaceVectorLayer | null>(null);

    const [xyzName, setXyzName] = useState("");
    const [xyzTemplate, setXyzTemplate] = useState("");
    const [xyzAttribution, setXyzAttribution] = useState("");
    const [xyzMinZoom, setXyzMinZoom] = useState("");
    const [xyzMaxZoom, setXyzMaxZoom] = useState("");
    const [xyzTileSize, setXyzTileSize] = useState<256 | 512>(256);
    const [xyzStatus, setXyzStatus] = useState<OperationStatus>("idle");
    const [xyzMessage, setXyzMessage] = useState<string | null>(null);

    const [wmsName, setWmsName] = useState("");
    const [wmsBaseUrl, setWmsBaseUrl] = useState("");
    const [wmsLayerName, setWmsLayerName] = useState("");
    const [wmsVersion, setWmsVersion] = useState<"1.1.1" | "1.3.0">("1.1.1");
    const [wmsFormat, setWmsFormat] = useState<"image/png" | "image/jpeg">("image/png");
    const [wmsTransparent, setWmsTransparent] = useState(true);
    const [wmsStyleName, setWmsStyleName] = useState("");
    const [wmsAttribution, setWmsAttribution] = useState("");
    const [wmsStatus, setWmsStatus] = useState<OperationStatus>("idle");
    const [wmsMessage, setWmsMessage] = useState<string | null>(null);
    const [wmsCapabilitiesLayers, setWmsCapabilitiesLayers] = useState<string[]>([]);

    const csvSummary = useMemo(
        () => csvDocument && csvLongitudeField && csvLatitudeField
            ? analyzeCsvCoordinates(csvDocument, csvLongitudeField, csvLatitudeField)
            : null,
        [csvDocument, csvLatitudeField, csvLongitudeField],
    );

    async function handleCsvFile(file: File) {
        setCsvStatus("loading");
        setCsvMessage("正在解析 CSV...");

        try {
            const document = await parseCsvPointFile(file);
            setCsvDocument(document);
            setCsvLongitudeField(document.suggestedLongitudeField ?? "");
            setCsvLatitudeField(document.suggestedLatitudeField ?? "");
            setCsvLayerName(document.suggestedLayerName);
            setCsvStatus("ready");
            setCsvMessage(
                document.suggestedLongitudeField && document.suggestedLatitudeField
                    ? "已自动识别经纬度字段，请确认后导入。"
                    : "请选择经度与纬度字段。",
            );
        } catch (error) {
            setCsvDocument(null);
            setCsvStatus("error");
            setCsvMessage(error instanceof Error ? error.message : "CSV 解析失败。");
        }
    }

    function handleImportCsv() {
        if (!csvDocument || !csvLongitudeField || !csvLatitudeField) {
            setCsvStatus("error");
            setCsvMessage("请选择经度与纬度字段。");
            return;
        }

        try {
            const result = createCsvPointLayer(csvDocument, {
                name: csvLayerName,
                longitudeField: csvLongitudeField,
                latitudeField: csvLatitudeField,
                styleIndex: overlayLayerCount,
            });
            onAddVectorLayer(result.layer);
            setCsvStatus("ready");
            setCsvMessage(`已导入 ${result.validRows} 个点，跳过 ${result.skippedRows} 行。`);
        } catch (error) {
            setCsvStatus("error");
            setCsvMessage(error instanceof Error ? error.message : "CSV 导入失败。");
        }
    }

    async function handleTestRemoteGeoJson() {
        setRemoteStatus("loading");
        setRemoteMessage("正在测试远程 GeoJSON...");
        setTestedRemoteLayer(null);

        try {
            const layer = await fetchRemoteGeoJson(remoteUrl);
            setTestedRemoteLayer(layer);
            setRemoteName((current) => current.trim() ? current : layer.name);
            setRemoteStatus("ready");
            setRemoteMessage(
                `连接成功：${layer.featureCount} features · ${layer.geometryKind}`,
            );
        } catch (error) {
            setRemoteStatus("error");
            setRemoteMessage(error instanceof Error ? error.message : "远程 GeoJSON 连接失败。");
        }
    }

    function handleAddRemoteGeoJson() {
        if (!testedRemoteLayer) {
            return;
        }

        onAddVectorLayer({
            ...testedRemoteLayer,
            id: crypto.randomUUID(),
            name: remoteName.trim() || testedRemoteLayer.name,
            createdAt: Date.now(),
        });
        setRemoteMessage(`已将 ${remoteName.trim() || testedRemoteLayer.name} 添加到地图。`);
        setTestedRemoteLayer(null);
    }

    function readOptionalZoom(value: string) {
        return value.trim() === "" ? undefined : Number(value);
    }

    function handleTestXyz() {
        try {
            validateXyzTileTemplate(xyzTemplate);
            setXyzStatus("ready");
            setXyzMessage("URL Template 结构有效，可添加到地图。实际瓦片可用性由地图加载验证。");
        } catch (error) {
            setXyzStatus("error");
            setXyzMessage(error instanceof Error ? error.message : "XYZ 模板无效。");
        }
    }

    function handleAddXyz() {
        try {
            const layer = createXyzRasterLayer({
                name: xyzName,
                urlTemplate: xyzTemplate,
                attribution: xyzAttribution,
                minZoom: readOptionalZoom(xyzMinZoom),
                maxZoom: readOptionalZoom(xyzMaxZoom),
                tileSize: xyzTileSize,
            });
            onAddRasterLayer(layer);
            setXyzStatus("ready");
            setXyzMessage(`已添加 XYZ 服务：${layer.name}`);
        } catch (error) {
            setXyzStatus("error");
            setXyzMessage(error instanceof Error ? error.message : "无法添加 XYZ 服务。");
        }
    }

    async function handleTestWms() {
        setWmsStatus("loading");
        setWmsMessage("正在测试 WMS GetCapabilities...");

        try {
            const result = await testWmsService(wmsBaseUrl);
            setWmsCapabilitiesLayers(result.layerNames);
            setWmsStatus("ready");
            setWmsMessage(
                result.layerNames.length > 0
                    ? `服务可访问，发现 ${result.layerNames.length} 个 Layer Name。`
                    : "服务可访问，请手动输入 Layer Name。",
            );
        } catch (error) {
            setWmsCapabilitiesLayers([]);
            setWmsStatus("error");
            setWmsMessage(
                `${error instanceof Error ? error.message : "WMS 测试失败。"} 仍可手动添加尝试。`,
            );
        }
    }

    function handleAddWms() {
        try {
            const layer = createWmsRasterLayer({
                name: wmsName,
                attribution: wmsAttribution,
                source: {
                    type: "wms",
                    baseUrl: wmsBaseUrl,
                    layerName: wmsLayerName,
                    version: wmsVersion,
                    format: wmsFormat,
                    transparent: wmsTransparent,
                    styleName: wmsStyleName,
                },
            });
            onAddRasterLayer(layer);
            setWmsStatus("ready");
            setWmsMessage(`已添加 WMS 服务：${layer.name}`);
        } catch (error) {
            setWmsStatus("error");
            setWmsMessage(error instanceof Error ? error.message : "无法添加 WMS 服务。");
        }
    }

    return (
        <aside className="data-source-panel">
            <header className="data-source-panel-header">
                <div>
                    <span>DATA SOURCES</span>
                    <h2>数据源</h2>
                    <p>连接公开空间数据，并加入当前工作区。</p>
                </div>
                <button type="button" aria-label="关闭数据源面板" onClick={onClose}>
                    <X size={17} aria-hidden="true" />
                </button>
            </header>

            <div className="data-source-panel-body">
                <section>
                    <span className="data-source-eyebrow">ADD DATA SOURCE</span>
                    <div className="data-source-type-tabs">
                        {SOURCE_TYPES.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className={sourceType === item.id ? "active" : undefined}
                                onClick={() => setSourceType(item.id)}
                            >
                                <strong>{item.label}</strong>
                                <span>{item.detail}</span>
                            </button>
                        ))}
                    </div>
                    <p className="data-source-security-note">
                        当前版本仅支持无需私密凭据的公开服务，连接配置会随工程保存。
                    </p>
                </section>

                {sourceType === "csv" && (
                    <section className="data-source-form-section">
                        <div className="data-source-section-title">
                            <FileSpreadsheet size={16} aria-hidden="true" />
                            <div><strong>CSV Point Data</strong><span>WGS84 / EPSG:4326</span></div>
                        </div>
                        <button type="button" className="data-source-secondary" onClick={() => csvInputRef.current?.click()} disabled={csvStatus === "loading"}>
                            选择 CSV
                        </button>
                        <input
                            ref={csvInputRef}
                            className="data-source-hidden-input"
                            type="file"
                            accept=".csv,text/csv"
                            onChange={(event) => {
                                const file = event.currentTarget.files?.[0];
                                if (file) void handleCsvFile(file);
                                event.currentTarget.value = "";
                            }}
                        />

                        {csvDocument && (
                            <div className="csv-mapping">
                                <div className="data-source-metrics">
                                    <div><strong>{csvDocument.filename}</strong><span>文件</span></div>
                                    <div><strong>{csvDocument.totalRows}</strong><span>总行数</span></div>
                                    <div><strong>{csvSummary?.validRows ?? "—"}</strong><span>有效</span></div>
                                    <div><strong>{csvSummary?.skippedRows ?? "—"}</strong><span>跳过</span></div>
                                </div>
                                <label><span>经度字段</span><select value={csvLongitudeField} onChange={(event) => setCsvLongitudeField(event.currentTarget.value)}><option value="">请选择</option>{csvDocument.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>
                                <label><span>纬度字段</span><select value={csvLatitudeField} onChange={(event) => setCsvLatitudeField(event.currentTarget.value)}><option value="">请选择</option>{csvDocument.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>
                                <label><span>图层名称</span><input value={csvLayerName} maxLength={80} onChange={(event) => setCsvLayerName(event.currentTarget.value)} /></label>

                                <div className="csv-preview-wrap">
                                    <span>PREVIEW · 前 5 行</span>
                                    <div className="csv-preview-scroll">
                                        <table><thead><tr>{csvDocument.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{csvDocument.rows.slice(0, 5).map((row, rowIndex) => <tr key={rowIndex}>{csvDocument.headers.map((header) => <td key={header}>{row[header]}</td>)}</tr>)}</tbody></table>
                                    </div>
                                </div>
                                <button type="button" className="data-source-primary" disabled={!csvSummary?.validRows || !csvLayerName.trim()} onClick={handleImportCsv}>导入为点图层</button>
                            </div>
                        )}
                        <StatusMessage status={csvStatus} message={csvMessage} />
                    </section>
                )}

                {sourceType === "geojson-url" && (
                    <section className="data-source-form-section">
                        <div className="data-source-section-title"><Globe2 size={16} aria-hidden="true" /><div><strong>GeoJSON URL</strong><span>加载后保存为矢量快照</span></div></div>
                        <label><span>URL</span><input type="url" placeholder="https://example.com/data.geojson" value={remoteUrl} onChange={(event) => { setRemoteUrl(event.currentTarget.value); setTestedRemoteLayer(null); setRemoteStatus("idle"); setRemoteMessage(null); }} /></label>
                        <label><span>图层名称</span><input placeholder="测试后自动推断" value={remoteName} maxLength={80} onChange={(event) => setRemoteName(event.currentTarget.value)} /></label>
                        <div className="data-source-button-row">
                            <button type="button" className="data-source-secondary" disabled={!remoteUrl.trim() || remoteStatus === "loading"} onClick={() => void handleTestRemoteGeoJson()}>测试连接</button>
                            <button type="button" className="data-source-primary" disabled={!testedRemoteLayer || !remoteName.trim()} onClick={handleAddRemoteGeoJson}>添加到地图</button>
                        </div>
                        <StatusMessage status={remoteStatus} message={remoteMessage} />
                    </section>
                )}

                {sourceType === "xyz" && (
                    <section className="data-source-form-section">
                        <div className="data-source-section-title"><Layers3 size={16} aria-hidden="true" /><div><strong>XYZ Tiles</strong><span>公开栅格瓦片服务</span></div></div>
                        <label><span>名称</span><input value={xyzName} maxLength={80} onChange={(event) => setXyzName(event.currentTarget.value)} /></label>
                        <label><span>URL Template</span><input value={xyzTemplate} placeholder="https://server/{z}/{x}/{y}.png" onChange={(event) => { setXyzTemplate(event.currentTarget.value); setXyzStatus("idle"); setXyzMessage(null); }} /></label>
                        <label><span>Attribution</span><input value={xyzAttribution} onChange={(event) => setXyzAttribution(event.currentTarget.value)} /></label>
                        <div className="data-source-inline-fields"><label><span>Min Zoom</span><input type="number" min="0" max="24" value={xyzMinZoom} onChange={(event) => setXyzMinZoom(event.currentTarget.value)} /></label><label><span>Max Zoom</span><input type="number" min="0" max="24" value={xyzMaxZoom} onChange={(event) => setXyzMaxZoom(event.currentTarget.value)} /></label><label><span>Tile Size</span><select value={xyzTileSize} onChange={(event) => setXyzTileSize(Number(event.currentTarget.value) === 512 ? 512 : 256)}><option value="256">256</option><option value="512">512</option></select></label></div>
                        <div className="data-source-button-row"><button type="button" className="data-source-secondary" disabled={!xyzTemplate.trim()} onClick={handleTestXyz}>校验模板</button><button type="button" className="data-source-primary" disabled={!xyzName.trim() || !xyzTemplate.trim()} onClick={handleAddXyz}>添加到地图</button></div>
                        <StatusMessage status={xyzStatus} message={xyzMessage} />
                    </section>
                )}

                {sourceType === "wms" && (
                    <section className="data-source-form-section">
                        <div className="data-source-section-title"><RadioTower size={16} aria-hidden="true" /><div><strong>WMS Service</strong><span>GetMap via EPSG:3857 tiles</span></div></div>
                        <label><span>名称</span><input value={wmsName} maxLength={80} onChange={(event) => setWmsName(event.currentTarget.value)} /></label>
                        <label><span>Base URL</span><input type="url" value={wmsBaseUrl} placeholder="https://server/geoserver/wms" onChange={(event) => { setWmsBaseUrl(event.currentTarget.value); setWmsCapabilitiesLayers([]); setWmsStatus("idle"); setWmsMessage(null); }} /></label>
                        <label><span>Layer Name</span><input list="wms-layer-name-list" value={wmsLayerName} onChange={(event) => setWmsLayerName(event.currentTarget.value)} /><datalist id="wms-layer-name-list">{wmsCapabilitiesLayers.map((name) => <option key={name} value={name} />)}</datalist></label>
                        <div className="data-source-inline-fields"><label><span>Version</span><select value={wmsVersion} onChange={(event) => setWmsVersion(event.currentTarget.value === "1.3.0" ? "1.3.0" : "1.1.1")}><option value="1.1.1">1.1.1</option><option value="1.3.0">1.3.0</option></select></label><label><span>Format</span><select value={wmsFormat} onChange={(event) => setWmsFormat(event.currentTarget.value === "image/jpeg" ? "image/jpeg" : "image/png")}><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option></select></label></div>
                        <label><span>Style</span><input value={wmsStyleName} placeholder="默认留空" onChange={(event) => setWmsStyleName(event.currentTarget.value)} /></label>
                        <label><span>Attribution</span><input value={wmsAttribution} onChange={(event) => setWmsAttribution(event.currentTarget.value)} /></label>
                        <label className="data-source-check"><input type="checkbox" checked={wmsTransparent} onChange={(event) => setWmsTransparent(event.currentTarget.checked)} /><span>Transparent</span></label>
                        <div className="data-source-button-row"><button type="button" className="data-source-secondary" disabled={!wmsBaseUrl.trim() || wmsStatus === "loading"} onClick={() => void handleTestWms()}>测试服务</button><button type="button" className="data-source-primary" disabled={!wmsName.trim() || !wmsBaseUrl.trim() || !wmsLayerName.trim()} onClick={handleAddWms}>添加服务</button></div>
                        <StatusMessage status={wmsStatus} message={wmsMessage} />
                    </section>
                )}

                <section className="connected-sources-section">
                    <span className="data-source-eyebrow">CONNECTED SOURCES</span>
                    {rasterLayers.length === 0 ? (
                        <p>尚未连接外部地图服务。</p>
                    ) : (
                        <ul>{rasterLayers.map((layer) => <li key={layer.id}><Database size={14} aria-hidden="true" /><span><strong>{layer.name}</strong><small>{layer.sourceType.toUpperCase()} Raster · {layer.visible ? "Visible" : "Hidden"}</small></span><i aria-label="配置已就绪" /></li>)}</ul>
                    )}
                </section>
            </div>
        </aside>
    );
}
