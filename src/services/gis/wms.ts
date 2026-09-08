import type { WmsRasterSource } from "../../types/mapLayer";
import { parsePublicHttpUrl } from "../import/remoteGeoJson";

export interface WmsCapabilitiesResult {
    accessible: true;
    layerNames: string[];
}

function deleteParametersCaseInsensitive(
    params: URLSearchParams,
    names: readonly string[],
) {
    const normalizedNames = new Set(names.map((name) => name.toLocaleUpperCase()));

    for (const key of [...params.keys()]) {
        if (normalizedNames.has(key.toLocaleUpperCase())) {
            params.delete(key);
        }
    }
}

export function buildWmsTileUrl(source: WmsRasterSource) {
    const url = parsePublicHttpUrl(source.baseUrl);
    const params = url.searchParams;

    deleteParametersCaseInsensitive(params, [
        "SERVICE",
        "REQUEST",
        "VERSION",
        "LAYERS",
        "STYLES",
        "FORMAT",
        "TRANSPARENT",
        "SRS",
        "CRS",
        "BBOX",
        "WIDTH",
        "HEIGHT",
    ]);

    params.set("SERVICE", "WMS");
    params.set("REQUEST", "GetMap");
    params.set("VERSION", source.version);
    params.set("LAYERS", source.layerName);
    params.set("STYLES", source.styleName);
    params.set("FORMAT", source.format);
    params.set("TRANSPARENT", String(source.transparent));
    params.set(source.version === "1.3.0" ? "CRS" : "SRS", "EPSG:3857");
    params.delete(source.version === "1.3.0" ? "SRS" : "CRS");
    params.set("BBOX", "{bbox-epsg-3857}");
    params.set("WIDTH", "256");
    params.set("HEIGHT", "256");

    return url.toString().replace(
        /%7Bbbox-epsg-3857%7D/gi,
        "{bbox-epsg-3857}",
    );
}

export async function testWmsService(
    rawBaseUrl: string,
    timeoutMs = 12_000,
): Promise<WmsCapabilitiesResult> {
    const url = parsePublicHttpUrl(rawBaseUrl);
    deleteParametersCaseInsensitive(url.searchParams, ["SERVICE", "REQUEST"]);
    url.searchParams.set("SERVICE", "WMS");
    url.searchParams.set("REQUEST", "GetCapabilities");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        let response: Response;

        try {
            response = await fetch(url, {
                signal: controller.signal,
                credentials: "omit",
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                throw new Error("WMS 服务测试超时。");
            }

            throw new Error(
                "浏览器无法测试该 WMS；目标地图服务可能未允许跨域访问（CORS）。",
            );
        }

        if (!response.ok) {
            throw new Error(`WMS 服务返回 HTTP ${response.status}。`);
        }

        const text = await response.text();
        const document = new DOMParser().parseFromString(text, "application/xml");
        const parserError = document.querySelector("parsererror");

        if (parserError) {
            throw new Error("WMS GetCapabilities 返回的 XML 无法解析。");
        }

        const layerNames = Array.from(document.getElementsByTagName("Name"))
            .map((node) => node.textContent?.trim() ?? "")
            .filter(Boolean)
            .filter((name, index, values) => values.indexOf(name) === index)
            .slice(0, 200);

        return { accessible: true, layerNames };
    } finally {
        window.clearTimeout(timeoutId);
    }
}
