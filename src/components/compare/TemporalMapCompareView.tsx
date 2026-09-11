import {
    useEffect,
    useRef,
    useState,
} from "react";
import maplibregl, {
    type ExpressionSpecification,
    type GeoJSONSource,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import { LAND_USE_COLORS } from "../../constants/landUse";
import type { LandUseFeatureCollection } from "../../types/landUse";
import type { LayerStyle } from "../../types/layerStyle";
import type {
    TemporalCompareCaptureResult,
    TemporalMapCompareConfig,
} from "../../types/mapCompare";
import type { ProjectMapState } from "../../types/project";
import type { BasemapType } from "../../types/workspace";
import { BASEMAP_STYLES } from "../../constants/basemaps";
import { MapLegend } from "../map/MapLegend";
import "../../styles/temporalCompare.css";

const COMPARE_SOURCE_ID = "temporal-compare-primary-source";
const COMPARE_FILL_LAYER_ID = "temporal-compare-primary-fill";
const COMPARE_OUTLINE_LAYER_ID = "temporal-compare-primary-outline";
const NO_DATA_COLOR = "#cbd5e1";

interface TemporalMapCompareViewProps {
    beforeCollection: LandUseFeatureCollection;
    afterCollection: LandUseFeatureCollection;
    beforeLabel: string;
    afterLabel: string;
    config: TemporalMapCompareConfig;
    layerStyle: LayerStyle;
    basemap: BasemapType;
    initialViewState: ProjectMapState;
    captureRequestId: number | null;
    onCapture: (result: TemporalCompareCaptureResult) => void;
    onViewStateChange: (state: ProjectMapState) => void;
}

function createFillColor(style: LayerStyle): string | ExpressionSpecification {
    if (style.symbologyMode === "single") {
        return style.fillColor;
    }

    if (style.symbologyMode === "categorized") {
        return [
            "match",
            ["get", style.categorizedField],
            "residential", LAND_USE_COLORS.residential,
            "commercial", LAND_USE_COLORS.commercial,
            "industrial", LAND_USE_COLORS.industrial,
            "green", LAND_USE_COLORS.green,
            "public", LAND_USE_COLORS.public,
            "transportation", LAND_USE_COLORS.transportation,
            LAND_USE_COLORS.other,
        ];
    }

    const firstClass = style.graduatedClasses[0];

    if (!firstClass) {
        return NO_DATA_COLOR;
    }

    const stops = style.graduatedClasses
        .slice(1)
        .flatMap((item) => [item.min, item.color]);
    const step = [
        "step",
        ["to-number", ["get", style.graduatedField]],
        firstClass.color,
        ...stops,
    ] as ExpressionSpecification;

    return [
        "case",
        [
            "all",
            ["has", style.graduatedField],
            ["!=", ["get", style.graduatedField], null],
        ],
        step,
        NO_DATA_COLOR,
    ] as ExpressionSpecification;
}

function ensureCompareLayers(
    map: maplibregl.Map,
    collection: LandUseFeatureCollection,
    style: LayerStyle,
) {
    const existing = map.getSource(COMPARE_SOURCE_ID) as GeoJSONSource | undefined;

    if (existing) {
        existing.setData(collection);
    } else {
        map.addSource(COMPARE_SOURCE_ID, {
            type: "geojson",
            data: collection,
        });
    }

    if (!map.getLayer(COMPARE_FILL_LAYER_ID)) {
        map.addLayer({
            id: COMPARE_FILL_LAYER_ID,
            type: "fill",
            source: COMPARE_SOURCE_ID,
            paint: {
                "fill-color": createFillColor(style),
                "fill-opacity": style.fillOpacity,
            },
        });
    }

    if (!map.getLayer(COMPARE_OUTLINE_LAYER_ID)) {
        map.addLayer({
            id: COMPARE_OUTLINE_LAYER_ID,
            type: "line",
            source: COMPARE_SOURCE_ID,
            paint: {
                "line-color": style.outlineColor,
                "line-width": style.outlineWidth,
                "line-opacity": style.outlineOpacity,
            },
        });
    }

    map.setLayoutProperty(
        COMPARE_FILL_LAYER_ID,
        "visibility",
        style.layerVisible && style.fillVisible ? "visible" : "none",
    );
    map.setLayoutProperty(
        COMPARE_OUTLINE_LAYER_ID,
        "visibility",
        style.layerVisible && style.outlineVisible ? "visible" : "none",
    );
    map.setPaintProperty(COMPARE_FILL_LAYER_ID, "fill-color", createFillColor(style));
    map.setPaintProperty(COMPARE_FILL_LAYER_ID, "fill-opacity", style.fillOpacity);
    map.setPaintProperty(COMPARE_OUTLINE_LAYER_ID, "line-color", style.outlineColor);
    map.setPaintProperty(COMPARE_OUTLINE_LAYER_ID, "line-width", style.outlineWidth);
    map.setPaintProperty(COMPARE_OUTLINE_LAYER_ID, "line-opacity", style.outlineOpacity);
}

function readCamera(map: maplibregl.Map, basemap: BasemapType): ProjectMapState {
    const center = map.getCenter();
    return {
        basemap,
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
    };
}

function copyCamera(source: maplibregl.Map, target: maplibregl.Map) {
    const sourceCenter = source.getCenter();
    const targetCenter = target.getCenter();
    const matches =
        Math.abs(sourceCenter.lng - targetCenter.lng) < 1e-9 &&
        Math.abs(sourceCenter.lat - targetCenter.lat) < 1e-9 &&
        Math.abs(source.getZoom() - target.getZoom()) < 1e-9 &&
        Math.abs(source.getBearing() - target.getBearing()) < 1e-9 &&
        Math.abs(source.getPitch() - target.getPitch()) < 1e-9;

    if (matches) return;

    target.jumpTo({
        center: sourceCenter,
        zoom: source.getZoom(),
        bearing: source.getBearing(),
        pitch: source.getPitch(),
    });
}

function captureMap(map: maplibregl.Map) {
    return new Promise<{ dataUrl: string | null; error: string | null }>((resolve) => {
        let settled = false;
        const finish = (dataUrl: string | null, error: string | null) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            map.off("render", handleRender);
            resolve({ dataUrl, error });
        };
        const handleRender = () => {
            try {
                const canvas = map.getCanvas();
                const dataUrl = canvas.toDataURL("image/png");
                finish(
                    dataUrl.startsWith("data:image/png;base64,") && dataUrl.length > 100
                        ? dataUrl
                        : null,
                    dataUrl.length > 100 ? null : "地图画布未生成有效图像。",
                );
            } catch {
                finish(null, "地图快照受浏览器或底图跨域策略限制，无法生成。");
            }
        };
        const timeoutId = window.setTimeout(
            () => finish(null, "地图快照生成超时，请重试。"),
            4_000,
        );
        map.once("render", handleRender);
        map.triggerRepaint();
    });
}

export function TemporalMapCompareView({
    beforeCollection,
    afterCollection,
    beforeLabel,
    afterLabel,
    config,
    layerStyle,
    basemap,
    initialViewState,
    captureRequestId,
    onCapture,
    onViewStateChange,
}: TemporalMapCompareViewProps) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const beforeContainerRef = useRef<HTMLDivElement | null>(null);
    const afterContainerRef = useRef<HTMLDivElement | null>(null);
    const beforeMapRef = useRef<maplibregl.Map | null>(null);
    const afterMapRef = useRef<maplibregl.Map | null>(null);
    const syncingRef = useRef(false);
    const latestConfigRef = useRef(config);
    const latestBasemapRef = useRef(basemap);
    const latestStyleRef = useRef(layerStyle);
    const latestBeforeCollectionRef = useRef(beforeCollection);
    const latestAfterCollectionRef = useRef(afterCollection);
    const appliedBasemapRef = useRef(basemap);
    const initialViewStateRef = useRef(initialViewState);
    const latestOnViewStateChangeRef = useRef(onViewStateChange);
    const [readySides, setReadySides] = useState({ before: false, after: false });
    const [loadError, setLoadError] = useState<string | null>(null);
    const [swipePosition, setSwipePosition] = useState(50);

    useEffect(() => {
        latestConfigRef.current = config;
        latestBasemapRef.current = basemap;
        latestStyleRef.current = layerStyle;
        latestBeforeCollectionRef.current = beforeCollection;
        latestAfterCollectionRef.current = afterCollection;
        latestOnViewStateChangeRef.current = onViewStateChange;
    }, [
        afterCollection,
        basemap,
        beforeCollection,
        config,
        layerStyle,
        onViewStateChange,
    ]);

    useEffect(() => {
        const beforeContainer = beforeContainerRef.current;
        const afterContainer = afterContainerRef.current;
        const root = rootRef.current;
        if (!beforeContainer || !afterContainer || !root) return;

        const options = {
            style: BASEMAP_STYLES[latestBasemapRef.current],
            center: initialViewStateRef.current.center,
            zoom: initialViewStateRef.current.zoom,
            bearing: initialViewStateRef.current.bearing,
            pitch: initialViewStateRef.current.pitch,
        };
        const beforeMap = new maplibregl.Map({ container: beforeContainer, ...options });
        const afterMap = new maplibregl.Map({ container: afterContainer, ...options });
        beforeMapRef.current = beforeMap;
        afterMapRef.current = afterMap;
        let beforeReady = false;
        let afterReady = false;
        const loadTimeoutId = window.setTimeout(() => {
            if (!beforeReady || !afterReady) {
                setLoadError("部分对比地图未能完成加载，请检查底图网络后重试。 ");
            }
        }, 12_000);
        beforeMap.addControl(new maplibregl.NavigationControl(), "top-right");
        afterMap.addControl(new maplibregl.NavigationControl(), "top-right");

        const ensureBefore = () => {
            ensureCompareLayers(
                beforeMap,
                latestBeforeCollectionRef.current,
                latestStyleRef.current,
            );
            setReadySides((current) => ({ ...current, before: true }));
            beforeReady = true;
            if (afterReady) window.clearTimeout(loadTimeoutId);
        };
        const ensureAfter = () => {
            ensureCompareLayers(
                afterMap,
                latestAfterCollectionRef.current,
                latestStyleRef.current,
            );
            setReadySides((current) => ({ ...current, after: true }));
            afterReady = true;
            if (beforeReady) window.clearTimeout(loadTimeoutId);
        };
        beforeMap.on("load", ensureBefore);
        afterMap.on("load", ensureAfter);
        beforeMap.on("style.load", ensureBefore);
        afterMap.on("style.load", ensureAfter);

        const syncFrom = (source: maplibregl.Map, target: maplibregl.Map) => {
            if (
                syncingRef.current ||
                (!latestConfigRef.current.syncCamera && latestConfigRef.current.layout !== "swipe")
            ) return;
            syncingRef.current = true;
            copyCamera(source, target);
            syncingRef.current = false;
        };
        const syncBefore = () => syncFrom(beforeMap, afterMap);
        const syncAfter = () => syncFrom(afterMap, beforeMap);
        const reportBefore = () => latestOnViewStateChangeRef.current(
            readCamera(beforeMap, latestBasemapRef.current),
        );
        const reportAfter = () => {
            if (latestConfigRef.current.layout === "swipe") {
                latestOnViewStateChangeRef.current(
                    readCamera(afterMap, latestBasemapRef.current),
                );
            } else {
                latestOnViewStateChangeRef.current(
                    readCamera(afterMap, latestBasemapRef.current),
                );
            }
        };
        beforeMap.on("move", syncBefore);
        afterMap.on("move", syncAfter);
        beforeMap.on("moveend", reportBefore);
        afterMap.on("moveend", reportAfter);

        const resizeObserver = new ResizeObserver(() => {
            beforeMap.resize();
            afterMap.resize();
        });
        resizeObserver.observe(root);

        return () => {
            resizeObserver.disconnect();
            window.clearTimeout(loadTimeoutId);
            beforeMap.off("load", ensureBefore);
            afterMap.off("load", ensureAfter);
            beforeMap.off("style.load", ensureBefore);
            afterMap.off("style.load", ensureAfter);
            beforeMap.off("move", syncBefore);
            afterMap.off("move", syncAfter);
            beforeMap.off("moveend", reportBefore);
            afterMap.off("moveend", reportAfter);
            beforeMap.remove();
            afterMap.remove();
            beforeMapRef.current = null;
            afterMapRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (appliedBasemapRef.current === basemap) return;
        appliedBasemapRef.current = basemap;
        setReadySides({ before: false, after: false });
        setLoadError(null);
        const maps = [beforeMapRef.current, afterMapRef.current];
        for (const map of maps) {
            if (map) {
                map.setStyle(BASEMAP_STYLES[basemap]);
            }
        }
    }, [basemap]);

    useEffect(() => {
        const pairs: Array<[maplibregl.Map | null, LandUseFeatureCollection]> = [
            [beforeMapRef.current, beforeCollection],
            [afterMapRef.current, afterCollection],
        ];
        for (const [map, collection] of pairs) {
            if (map?.isStyleLoaded()) ensureCompareLayers(map, collection, layerStyle);
        }
    }, [afterCollection, beforeCollection, layerStyle]);

    useEffect(() => {
        if (!config.syncCamera || config.layout === "swipe") {
            const source = config.layout === "swipe"
                ? afterMapRef.current
                : null;
            const target = config.layout === "swipe"
                ? beforeMapRef.current
                : null;
            if (source && target) copyCamera(source, target);
            return;
        }
        if (beforeMapRef.current && afterMapRef.current) {
            copyCamera(beforeMapRef.current, afterMapRef.current);
        }
    }, [config.layout, config.syncCamera]);

    useEffect(() => {
        if (captureRequestId === null) return;
        const beforeMap = beforeMapRef.current;
        const afterMap = afterMapRef.current;
        if (!beforeMap || !afterMap) {
            const image = { dataUrl: null, error: "时序对比地图尚未完成初始化。" };
            onCapture({ requestId: captureRequestId, before: image, after: image });
            return;
        }
        let cancelled = false;
        let settled = false;
        void Promise.all([captureMap(beforeMap), captureMap(afterMap)]).then(
            ([before, after]) => {
                if (!cancelled) {
                    settled = true;
                    onCapture({ requestId: captureRequestId, before, after });
                }
            },
        );
        return () => {
            cancelled = true;
            if (!settled) {
                const image = {
                    dataUrl: null,
                    error: "时序对比地图已关闭，捕获已取消。",
                };
                onCapture({
                    requestId: captureRequestId,
                    before: image,
                    after: image,
                });
            }
        };
    }, [captureRequestId, onCapture]);

    function updateSwipePosition(clientX: number) {
        const rect = rootRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;
        setSwipePosition(Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)));
    }

    const ready = readySides.before && readySides.after;
    const swipe = config.layout === "swipe";

    return (
        <div
            ref={rootRef}
            className={`temporal-map-compare ${swipe ? "is-swipe" : "is-split"}`}
        >
            <div className="temporal-compare-map temporal-compare-after-map">
                <div ref={afterContainerRef} className="temporal-compare-map-canvas" />
                <span className="temporal-compare-map-label"><small>AFTER</small>{afterLabel}</span>
            </div>
            <div
                className="temporal-compare-map temporal-compare-before-map"
                style={swipe ? { clipPath: `inset(0 ${100 - swipePosition}% 0 0)` } : undefined}
            >
                <div ref={beforeContainerRef} className="temporal-compare-map-canvas" />
                <span className="temporal-compare-map-label"><small>BEFORE</small>{beforeLabel}</span>
            </div>

            {swipe && (
                <button
                    type="button"
                    className="temporal-compare-swipe-handle"
                    style={{ left: `${swipePosition}%` }}
                    aria-label={`卷帘位置 ${Math.round(swipePosition)}%`}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        updateSwipePosition(event.clientX);
                    }}
                    onPointerMove={(event) => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            updateSwipePosition(event.clientX);
                        }
                    }}
                    onPointerUp={(event) => {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }}
                ><span>↔</span></button>
            )}

            {!ready && !loadError && (
                <div className="temporal-compare-loading">正在准备时序对比...</div>
            )}
            {loadError && (
                <div className="temporal-compare-loading is-error">{loadError}</div>
            )}
            <MapLegend style={layerStyle} />
        </div>
    );
}
