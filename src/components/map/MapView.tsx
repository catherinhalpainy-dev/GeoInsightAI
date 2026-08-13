import {
    useEffect,
    useRef,
    useState,
} from "react";

import maplibregl, {
    type FilterSpecification,
    type ExpressionSpecification,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import {
    LAND_USE_COLORS,
    LAND_USE_FILL_LAYER_ID,
    LAND_USE_OUTLINE_LAYER_ID,
    LAND_USE_SOURCE_ID,
} from "../../constants/landUse";

import type {
    LandUseFeature,
    LandUseFeatureCollection,
} from "../../types/landUse";

import type {
    LayerStyle,
} from "../../types/layerStyle";

import type {
    WorkspaceTool,
} from "../../types/workspace";

import {
    calculateLandUseBounds,
} from "../../utils/calculateLandUseBounds";


const SELECTED_FILL_LAYER_ID =
    "land-use-selected-fill";

const SELECTED_OUTLINE_LAYER_ID =
    "land-use-selected-outline";


interface MapViewProps {
    collection?:
    LandUseFeatureCollection;

    interactionMode:
    WorkspaceTool;

    layerStyle:
    LayerStyle;

    selectedFeatureId?:
    string | null;

    onFeatureSelect?: (
        feature:
            LandUseFeature | null,
    ) => void;
}


interface MapRuntimeInfo {
    longitude:
    number | null;

    latitude:
    number | null;

    zoom:
    number;
}


function createClassifiedFillColor(): ExpressionSpecification {
    return [
        "match",

        ["get", "landUseType"],

        "residential",
        LAND_USE_COLORS.residential,

        "commercial",
        LAND_USE_COLORS.commercial,

        "industrial",
        LAND_USE_COLORS.industrial,

        "green",
        LAND_USE_COLORS.green,

        "public",
        LAND_USE_COLORS.public,

        "transportation",
        LAND_USE_COLORS.transportation,

        LAND_USE_COLORS.other,
    ];
}


function applyLayerStyle(
    map: maplibregl.Map,
    style: LayerStyle,
) {
    const fillVisible =
        style.layerVisible &&
        style.fillVisible;

    const outlineVisible =
        style.layerVisible &&
        style.outlineVisible;


    if (
        map.getLayer(
            LAND_USE_FILL_LAYER_ID,
        )
    ) {
        map.setLayoutProperty(
            LAND_USE_FILL_LAYER_ID,
            "visibility",
            fillVisible
                ? "visible"
                : "none",
        );

        map.setPaintProperty(
            LAND_USE_FILL_LAYER_ID,
            "fill-color",
            style.colorMode ===
                "classified"
                ? createClassifiedFillColor()
                : style.fillColor,
        );

        map.setPaintProperty(
            LAND_USE_FILL_LAYER_ID,
            "fill-opacity",
            style.fillOpacity,
        );
    }


    if (
        map.getLayer(
            LAND_USE_OUTLINE_LAYER_ID,
        )
    ) {
        map.setLayoutProperty(
            LAND_USE_OUTLINE_LAYER_ID,
            "visibility",
            outlineVisible
                ? "visible"
                : "none",
        );

        map.setPaintProperty(
            LAND_USE_OUTLINE_LAYER_ID,
            "line-color",
            style.outlineColor,
        );

        map.setPaintProperty(
            LAND_USE_OUTLINE_LAYER_ID,
            "line-width",
            style.outlineWidth,
        );

        map.setPaintProperty(
            LAND_USE_OUTLINE_LAYER_ID,
            "line-opacity",
            style.outlineOpacity,
        );
    }


    const selectionVisible =
        style.layerVisible
            ? "visible"
            : "none";


    if (
        map.getLayer(
            SELECTED_FILL_LAYER_ID,
        )
    ) {
        map.setLayoutProperty(
            SELECTED_FILL_LAYER_ID,
            "visibility",
            selectionVisible,
        );
    }


    if (
        map.getLayer(
            SELECTED_OUTLINE_LAYER_ID,
        )
    ) {
        map.setLayoutProperty(
            SELECTED_OUTLINE_LAYER_ID,
            "visibility",
            selectionVisible,
        );
    }
}


function createEmptySelectionFilter():
    FilterSpecification {
    return [
        "==",
        ["get", "id"],
        "__no_selected_feature__",
    ];
}


export function MapView({
    collection,
    interactionMode,
    layerStyle,
    selectedFeatureId = null,
    onFeatureSelect,
}: MapViewProps) {
    const containerRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const mapRef =
        useRef<maplibregl.Map | null>(
            null,
        );


    const latestCollectionRef =
        useRef(collection);

    const latestInteractionModeRef =
        useRef(interactionMode);

    const latestLayerStyleRef =
        useRef(layerStyle);

    const latestOnFeatureSelectRef =
        useRef(onFeatureSelect);


    const [
        runtimeInfo,
        setRuntimeInfo,
    ] =
        useState<MapRuntimeInfo>({
            longitude: null,
            latitude: null,
            zoom: 10,
        });


    /*
     * 创建 MapLibre 实例
     *
     * Map 只创建一次。
     */
    useEffect(() => {
        const container =
            containerRef.current;

        if (!container) {
            return;
        }


        const map =
            new maplibregl.Map({
                container,

                style:
                    "/map_style.json",

                center: [
                    116.40,
                    39.93,
                ],

                zoom: 10,
            });


        mapRef.current =
            map;


        map.addControl(
            new maplibregl.NavigationControl(),
            "top-right",
        );


        const resizeObserver =
            new ResizeObserver(
                () => {
                    map.resize();
                },
            );


        resizeObserver.observe(
            container,
        );


        const handleMouseMove = (
            event:
                maplibregl.MapMouseEvent,
        ) => {
            setRuntimeInfo(
                (previous) => ({
                    ...previous,

                    longitude:
                        event.lngLat.lng,

                    latitude:
                        event.lngLat.lat,
                }),
            );
        };


        const handleZoomEnd =
            () => {
                setRuntimeInfo(
                    (previous) => ({
                        ...previous,

                        zoom:
                            map.getZoom(),
                    }),
                );
            };


        /*
         * Identify / Select Feature
         */
        const handleMapClick = (
            event:
                maplibregl.MapMouseEvent,
        ) => {
            if (
                latestInteractionModeRef.current !==
                "select"
            ) {
                return;
            }


            if (
                !map.getLayer(
                    LAND_USE_FILL_LAYER_ID,
                )
            ) {
                return;
            }


            const features =
                map.queryRenderedFeatures(
                    event.point,
                    {
                        layers: [
                            LAND_USE_FILL_LAYER_ID,
                        ],
                    },
                );


            if (
                features.length === 0
            ) {
                latestOnFeatureSelectRef
                    .current?.(
                        null,
                    );

                return;
            }


            const featureId =
                features[0]
                    .properties?.id;


            if (
                typeof featureId !==
                "string"
            ) {
                return;
            }


            const selected =
                latestCollectionRef
                    .current
                    ?.features
                    .find(
                        (feature) =>
                            feature.properties.id ===
                            featureId,
                    );


            latestOnFeatureSelectRef
                .current?.(
                    selected ?? null,
                );
        };


        map.on(
            "mousemove",
            handleMouseMove,
        );

        map.on(
            "zoomend",
            handleZoomEnd,
        );

        map.on(
            "click",
            handleMapClick,
        );


        return () => {
            map.off(
                "mousemove",
                handleMouseMove,
            );

            map.off(
                "zoomend",
                handleZoomEnd,
            );

            map.off(
                "click",
                handleMapClick,
            );

            resizeObserver.disconnect();

            map.remove();

            mapRef.current =
                null;
        };
    }, []);


    /*
     * 保存最新 callback。
     *
     * Map click handler
     * 是初始化时创建的，
     * 所以通过 ref 读取最新 callback。
     */
    useEffect(() => {
        latestOnFeatureSelectRef.current =
            onFeatureSelect;
    }, [
        onFeatureSelect,
    ]);


    /*
     * collection → MapLibre Source
     */
    useEffect(() => {
        latestCollectionRef.current =
            collection;


        const map =
            mapRef.current;


        if (
            !map ||
            !collection
        ) {
            return;
        }


        const updateSource =
            () => {
                const existingSource =
                    map.getSource(
                        LAND_USE_SOURCE_ID,
                    );


                /*
                 * Source 已存在：
                 * 只更新 GeoJSON。
                 */
                if (existingSource) {
                    (
                        existingSource as
                        maplibregl.GeoJSONSource
                    ).setData(
                        collection,
                    );

                    return;
                }


                /*
                 * 第一次加载：
                 * Source + Layer。
                 */
                map.addSource(
                    LAND_USE_SOURCE_ID,
                    {
                        type: "geojson",

                        data:
                            collection,
                    },
                );


                map.addLayer({
                    id:
                        LAND_USE_FILL_LAYER_ID,

                    type: "fill",

                    source:
                        LAND_USE_SOURCE_ID,

                    paint: {
                        "fill-color":
                            createClassifiedFillColor(),

                        "fill-opacity":
                            0.68,
                    },
                });


                map.addLayer({
                    id:
                        LAND_USE_OUTLINE_LAYER_ID,

                    type: "line",

                    source:
                        LAND_USE_SOURCE_ID,

                    paint: {
                        "line-color":
                            "#ffffff",

                        "line-width":
                            1,

                        "line-opacity":
                            0.8,
                    },
                });


                /*
                 * Selected Feature
                 *
                 * 使用同一 Source，
                 * 通过 filter 只显示
                 * 被选中的 Feature。
                 */
                map.addLayer({
                    id:
                        SELECTED_FILL_LAYER_ID,

                    type: "fill",

                    source:
                        LAND_USE_SOURCE_ID,

                    filter:
                        createEmptySelectionFilter(),

                    paint: {
                        "fill-color":
                            "#facc15",

                        "fill-opacity":
                            0.24,
                    },
                });


                map.addLayer({
                    id:
                        SELECTED_OUTLINE_LAYER_ID,

                    type: "line",

                    source:
                        LAND_USE_SOURCE_ID,

                    filter:
                        createEmptySelectionFilter(),

                    paint: {
                        "line-color":
                            "#facc15",

                        "line-width":
                            4,

                        "line-opacity":
                            1,
                    },
                });


                applyLayerStyle(
                    map,
                    latestLayerStyleRef.current,
                );


                /*
                 * 首次加载数据自动缩放至范围。
                 */
                const bounds =
                    calculateLandUseBounds(
                        collection.features,
                    );


                if (bounds) {
                    map.fitBounds(
                        [
                            [
                                bounds.minLongitude,
                                bounds.minLatitude,
                            ],

                            [
                                bounds.maxLongitude,
                                bounds.maxLatitude,
                            ],
                        ],

                        {
                            padding: 60,
                            duration: 500,
                        },
                    );
                }
            };


        if (
            map.isStyleLoaded()
        ) {
            updateSource();
        } else {
            map.once(
                "load",
                updateSource,
            );
        }


        return () => {
            map.off(
                "load",
                updateSource,
            );
        };
    }, [
        collection,
    ]);


    /*
     * Select / Pan
     */
    useEffect(() => {
        latestInteractionModeRef.current =
            interactionMode;


        const map =
            mapRef.current;


        if (!map) {
            return;
        }


        const canvas =
            map.getCanvas();


        if (
            interactionMode ===
            "pan"
        ) {
            map.dragPan.enable();

            canvas.style.cursor =
                "grab";

            return;
        }


        map.dragPan.disable();

        canvas.style.cursor =
            "crosshair";
    }, [
        interactionMode,
    ]);


    /*
     * Layer Style
     */
    useEffect(() => {
        latestLayerStyleRef.current =
            layerStyle;


        const map =
            mapRef.current;


        if (!map) {
            return;
        }


        applyLayerStyle(
            map,
            layerStyle,
        );
    }, [
        layerStyle,
    ]);


    /*
     * Selected Feature Highlight
     */
    useEffect(() => {
        const map =
            mapRef.current;


        if (!map) {
            return;
        }


        const filter:
            FilterSpecification =
            selectedFeatureId
                ? [
                    "==",

                    ["get", "id"],

                    selectedFeatureId,
                ]
                : createEmptySelectionFilter();


        if (
            map.getLayer(
                SELECTED_FILL_LAYER_ID,
            )
        ) {
            map.setFilter(
                SELECTED_FILL_LAYER_ID,
                filter,
            );
        }


        if (
            map.getLayer(
                SELECTED_OUTLINE_LAYER_ID,
            )
        ) {
            map.setFilter(
                SELECTED_OUTLINE_LAYER_ID,
                filter,
            );
        }
    }, [
        selectedFeatureId,
        collection,
    ]);


    return (
        <div className="map-view-shell">
            <div
                ref={containerRef}
                className="map-container"
            />


            <div className="map-runtime-info">
                <span>
                    {runtimeInfo.longitude !==
                        null &&
                        runtimeInfo.latitude !==
                        null
                        ? `${runtimeInfo.longitude.toFixed(
                            5,
                        )}°, ${runtimeInfo.latitude.toFixed(
                            5,
                        )}°`
                        : "移动鼠标查看坐标"}
                </span>


                <span>
                    Zoom：
                    {runtimeInfo.zoom.toFixed(
                        1,
                    )}
                </span>


                <span>
                    当前要素：
                    {
                        collection?.features
                            .length ?? 0
                    }
                </span>


                <span>
                    图层：
                    {layerStyle.layerVisible
                        ? "显示"
                        : "隐藏"}
                </span>
            </div>
        </div>
    );
}
