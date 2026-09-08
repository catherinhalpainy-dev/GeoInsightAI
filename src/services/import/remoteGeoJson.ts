import { parseOverlayGeoJson } from "../gis/overlayLayer";
import type { WorkspaceVectorLayer } from "../../types/mapLayer";

export type RemoteGeoJsonErrorCode =
    | "invalid-url"
    | "network"
    | "timeout"
    | "http"
    | "json"
    | "validation";

export class RemoteGeoJsonError extends Error {
    readonly code: RemoteGeoJsonErrorCode;

    constructor(
        code: RemoteGeoJsonErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "RemoteGeoJsonError";
        this.code = code;
    }
}

export function parsePublicHttpUrl(rawUrl: string) {
    let url: URL;

    try {
        url = new URL(rawUrl.trim());
    } catch {
        throw new RemoteGeoJsonError("invalid-url", "请输入有效的 HTTP 或 HTTPS URL。");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new RemoteGeoJsonError(
            "invalid-url",
            "仅支持公开的 HTTP 或 HTTPS 数据源。",
        );
    }

    if (url.username || url.password) {
        throw new RemoteGeoJsonError(
            "invalid-url",
            "当前版本不支持在 URL 中保存用户名或密码。",
        );
    }

    const sensitiveParameterNames = new Set([
        "token",
        "access_token",
        "api_key",
        "apikey",
        "key",
        "auth",
        "password",
    ]);
    const containsCredentialParameter = [...url.searchParams.keys()].some(
        (key) => sensitiveParameterNames.has(key.toLocaleLowerCase()),
    );

    if (containsCredentialParameter) {
        throw new RemoteGeoJsonError(
            "invalid-url",
            "当前版本不保存 API Token、Key 或其他私密凭据，请使用公开数据源 URL。",
        );
    }

    return url;
}

function inferFilename(url: URL) {
    const filename = url.pathname.split("/").filter(Boolean).at(-1);
    return filename || "remote-data.geojson";
}

export async function fetchRemoteGeoJson(
    rawUrl: string,
    timeoutMs = 12_000,
): Promise<WorkspaceVectorLayer> {
    const url = parsePublicHttpUrl(rawUrl);
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
                throw new RemoteGeoJsonError("timeout", "连接超时，请检查数据源地址。");
            }

            if (!navigator.onLine) {
                throw new RemoteGeoJsonError(
                    "network",
                    "当前浏览器处于离线状态，请恢复网络后重试。",
                );
            }

            throw new RemoteGeoJsonError(
                "network",
                "浏览器无法访问该数据源，目标服务器可能未允许跨域请求（CORS）。",
            );
        }

        if (!response.ok) {
            throw new RemoteGeoJsonError(
                "http",
                `数据源返回 HTTP ${response.status} ${response.statusText || "错误"}。`,
            );
        }

        const text = await response.text();
        let raw: unknown;

        try {
            raw = JSON.parse(text) as unknown;
        } catch {
            throw new RemoteGeoJsonError("json", "远程响应不是有效的 JSON。");
        }

        try {
            return parseOverlayGeoJson(raw, inferFilename(url), {
                type: "geojson-url",
                url: url.toString(),
            });
        } catch (error) {
            throw new RemoteGeoJsonError(
                "validation",
                error instanceof Error ? error.message : "远程数据不是有效的 GeoJSON FeatureCollection。",
            );
        }
    } finally {
        window.clearTimeout(timeoutId);
    }
}
