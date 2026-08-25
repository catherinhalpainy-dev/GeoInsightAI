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
    MapViewCommand,
    BasemapType,
} from "../../types/workspace";

import {
    calculateLandUseBounds,
} from "../../utils/calculateLandUseBounds";
import type { MeasureMode } from "../../types/measure";

const BASEMAP_STYLES: Record<
    BasemapType,
    string
> = {
    dark:
        "https://tiles.openfreemap.org/styles/dark",

    light:
        "https://tiles.openfreemap.org/styles/positron",

    blank:
        "/map_style_blank.json",
};

const SELECTED_FILL_LAYER_ID =
    "land-use-selected-fill";

const SELECTED_OUTLINE_LAYER_ID =
    "land-use-selected-outline";

const MEASURE_SOURCE_ID =
    "measure-source";


const MEASURE_FILL_LAYER_ID =
    "measure-fill";


const MEASURE_LINE_LAYER_ID =
    "measure-line";

const MEASURE_POINT_LAYER_ID =
    "measure-point";




interface MapViewProps {
    collection?:
    LandUseFeatureCollection;

    allCollection?:
    LandUseFeatureCollection;

    interactionMode:
    WorkspaceTool;

    layerStyle:
    LayerStyle;

    basemap?:
    BasemapType;

    selectedFeatureId?:
    string | null;

    viewCommand?:
    MapViewCommand | null;


    measureMode?:
    MeasureMode;


    measurePoints?:
    [number, number][];

    measureCompleted?:
    boolean;
    onFeatureSelect?: (
        feature:
            LandUseFeature | null,
    ) => void;
    onMeasurePointAdd?:
    (
        point: [number, number]
    ) => void;

    onMeasureComplete?:
    () => void;
}

interface MapRuntimeInfo {
    longitude:
    number | null;

    latitude:
    number | null;

    zoom:
    number;
}

interface PickedCoordinate {
    longitude:
    number;

    latitude:
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
function fitMapToFeatures(
    map: maplibregl.Map,

    features:
        LandUseFeature[],

    maxZoom = 16,
) {
    if (
        features.length === 0
    ) {
        return;
    }


    const bounds =
        calculateLandUseBounds(
            features,
        );


    if (!bounds) {
        return;
    }


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
            padding: 72,

            duration: 650,

            maxZoom,
        },
    );
}
function ensureLandUseLayers(
    map: maplibregl.Map,

    collection:
        LandUseFeatureCollection,

    layerStyle:
        LayerStyle,
) {
    /*
     * Source
     */
    if (
        !map.getSource(
            LAND_USE_SOURCE_ID,
        )
    ) {
        map.addSource(
            LAND_USE_SOURCE_ID,
            {
                type: "geojson",

                data:
                    collection,
            },
        );
    }


    /*
     * Fill
     */
    if (
        !map.getLayer(
            LAND_USE_FILL_LAYER_ID,
        )
    ) {
        map.addLayer({
            id:
                LAND_USE_FILL_LAYER_ID,

            type:
                "fill",

            source:
                LAND_USE_SOURCE_ID,

            paint: {
                "fill-color":
                    createClassifiedFillColor(),

                "fill-opacity":
                    0.68,
            },
        });
    }


    /*
     * Outline
     */
    if (
        !map.getLayer(
            LAND_USE_OUTLINE_LAYER_ID,
        )
    ) {
        map.addLayer({
            id:
                LAND_USE_OUTLINE_LAYER_ID,

            type:
                "line",

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
    }


    /*
     * Selected fill
     */
    if (
        !map.getLayer(
            SELECTED_FILL_LAYER_ID,
        )
    ) {
        map.addLayer({
            id:
                SELECTED_FILL_LAYER_ID,

            type:
                "fill",

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
    }


    /*
     * Selected outline
     */
    if (
        !map.getLayer(
            SELECTED_OUTLINE_LAYER_ID,
        )
    ) {
        map.addLayer({
            id:
                SELECTED_OUTLINE_LAYER_ID,

            type:
                "line",

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
    }


    applyLayerStyle(
        map,
        layerStyle,
    );
}
function ensureMeasureLayers(
    map: maplibregl.Map
) {

    if (
        !map.getSource(
            MEASURE_SOURCE_ID
        )
    ) {

        map.addSource(
            MEASURE_SOURCE_ID,
            {

                type: "geojson",

                data: {
                    type: "FeatureCollection",
                    features: []
                }

            }
        );

    }



    // 面填充

    if (
        !map.getLayer(
            MEASURE_FILL_LAYER_ID
        )
    ) {

        map.addLayer({

            id:
                MEASURE_FILL_LAYER_ID,


            type:
                "fill",


            source:
                MEASURE_SOURCE_ID,

            paint: {


                "fill-color":
                    "#14b8a6",


                "fill-opacity":
                    0.16


            }

        })

    }



    // 线

    if (
        !map.getLayer(
            MEASURE_LINE_LAYER_ID
        )
    ) {

        map.addLayer({

            id:
                MEASURE_LINE_LAYER_ID,


            type:
                "line",


            source:
                MEASURE_SOURCE_ID,

            layout: {
                "line-cap": "round",
                "line-join": "round",
            },

            paint: {


                "line-color":
                    "#2dd4bf",

                "line-width":
                    2,
                "line-opacity":
                    0.85,

                "line-dasharray":
                    [
                        4,
                        3
                    ]

            }


        })


    }

    if (
        !map.getLayer(
            MEASURE_POINT_LAYER_ID
        )
    ) {
        map.addLayer({
            id: MEASURE_POINT_LAYER_ID,
            type: "circle",
            source: MEASURE_SOURCE_ID,
            paint: {
                "circle-radius": 5,
                "circle-color":
                    "#14b8a6",

                "circle-stroke-color":
                    "#ffffff",

                "circle-stroke-width":
                    2,
            },
        });
    }


}

function updateMeasureLayer(
    map: maplibregl.Map,
    mode: MeasureMode,
    points: [number, number][]
) {
    const source = map.getSource(MEASURE_SOURCE_ID);

    if (!source || source.type !== "geojson") {
        return;
    }

    const geojsonSource = source as maplibregl.GeoJSONSource;

    if (mode === "none" || points.length === 0) {
        geojsonSource.setData({
            type: "FeatureCollection",
            features: [],
        });
        return;
    }

    const pointFeatures = points.map((point) => ({
        type: "Feature" as const,
        properties: {},
        geometry: {
            type: "Point" as const,
            coordinates: point,
        },
    }));

    if (mode === "distance") {
        const lineFeatures = points.length >= 2
            ? [{
                type: "Feature" as const,
                properties: {},
                geometry: {
                    type: "LineString" as const,
                    coordinates: points,
                },
            }]
            : [];

        geojsonSource.setData({
            type: "FeatureCollection",
            features: [
                ...lineFeatures,
                ...pointFeatures,
            ],
        });
        return;
    }

    const shapeFeatures = points.length >= 3
        ? [{
            type: "Feature" as const,
            properties: {},
            geometry: {
                type: "Polygon" as const,
                coordinates: [[...points, points[0]]],
            },
        }]
        : points.length === 2
            ? [{
                type: "Feature" as const,
                properties: {},
                geometry: {
                    type: "LineString" as const,
                    coordinates: points,
                },
            }]
            : [];

    geojsonSource.setData({
        type: "FeatureCollection",
        features: [
            ...shapeFeatures,
            ...pointFeatures,
        ],
    });
}
export function MapView({
    collection,
    allCollection,
    interactionMode,
    layerStyle,
    basemap = "dark",
    selectedFeatureId = null,
    viewCommand = null,
    measureMode = "none",
    measurePoints = [],
    measureCompleted = false,
    onFeatureSelect,
    onMeasurePointAdd,
    onMeasureComplete,
}: MapViewProps) {
    const containerRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const mapRef =
        useRef<maplibregl.Map | null>(
            null,
        );

    const initialBasemapRef =
        useRef(basemap);

    const [
        pickedCoordinate,
        setPickedCoordinate,
    ] =
        useState<PickedCoordinate | null>(
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

    const latestSelectedFeatureIdRef =
        useRef(selectedFeatureId);

    const latestOnMeasurePointAddRef =
        useRef(onMeasurePointAdd);

    const latestOnMeasureCompleteRef =
        useRef(onMeasureComplete);


    const latestMeasureModeRef =
        useRef<MeasureMode>(
            measureMode
        );


    const latestMeasurePointsRef =
        useRef<[number, number][]>(
            measurePoints
        );

    const latestMeasureCompletedRef =
        useRef(measureCompleted);

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
                    BASEMAP_STYLES[initialBasemapRef.current],

                center: [
                    116.40,
                    39.93,
                ],

                zoom: 10,
            });


        mapRef.current =
            map;

        const handleMapLoad = () => {
            ensureMeasureLayers(map);
            updateMeasureLayer(
                map,
                latestMeasureModeRef.current,
                latestMeasurePointsRef.current,
            );
        };

        map.on("load", handleMapLoad);
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
                latestMeasureModeRef.current !== "none"
            ) {
                if (
                    !latestMeasureCompletedRef.current &&
                    event.originalEvent.detail < 2
                ) {

                    latestOnMeasurePointAddRef.current?.(
                        [
                            event.lngLat.lng,
                            event.lngLat.lat
                        ]
                    );
                }


                return;

            }
            setPickedCoordinate({
                longitude:
                    event.lngLat.lng,

                latitude:
                    event.lngLat.lat,
            });
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

        const handleMapDoubleClick = (
            event: maplibregl.MapMouseEvent,
        ) => {
            if (
                latestMeasureModeRef.current === "none" ||
                latestMeasureCompletedRef.current
            ) {
                return;
            }

            event.preventDefault();
            latestOnMeasureCompleteRef.current?.();
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

        map.on(
            "dblclick",
            handleMapDoubleClick,
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

            map.off(
                "dblclick",
                handleMapDoubleClick,
            );

            map.off(
                "load",
                handleMapLoad,
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

        latestOnMeasurePointAddRef.current =
            onMeasurePointAdd;

        latestOnMeasureCompleteRef.current =
            onMeasureComplete;

        latestSelectedFeatureIdRef.current =
            selectedFeatureId;
    }, [
        onFeatureSelect,
        onMeasurePointAdd,
        onMeasureComplete,
        selectedFeatureId,
    ]);

    const previousBasemapRef =
        useRef<BasemapType>(
            basemap,
        );
    useEffect(() => {
        const map =
            mapRef.current;


        if (!map) {
            return;
        }


        if (
            previousBasemapRef.current ===
            basemap
        ) {
            return;
        }


        previousBasemapRef.current =
            basemap;


        const styleUrl =
            BASEMAP_STYLES[
            basemap
            ];



        const handleStyleLoad =
            () => {
                const currentCollection =
                    latestCollectionRef.current;

                ensureMeasureLayers(map);
                updateMeasureLayer(
                    map,
                    latestMeasureModeRef.current,
                    latestMeasurePointsRef.current,
                );

                if (
                    !currentCollection
                ) {
                    return;
                }


                ensureLandUseLayers(
                    map,
                    currentCollection,
                    latestLayerStyleRef.current,
                );

                /*
                 * 恢复当前选中地块
                 */
                const filter:
                    FilterSpecification =
                    latestSelectedFeatureIdRef.current
                        ? [
                            "==",
                            [
                                "get",
                                "id",
                            ],
                            latestSelectedFeatureIdRef.current,
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
            };


        map.once(
            "style.load",
            handleStyleLoad,

        );

        map.setStyle(
            styleUrl,
        );


        return () => {
            map.off(
                "style.load",
                handleStyleLoad,
            );
        };
    }, [
        basemap,
    ]);

    // 测距
    useEffect(() => {

        latestMeasureModeRef.current =
            measureMode;

        latestMeasurePointsRef.current =
            measurePoints;

        latestMeasureCompletedRef.current =
            measureCompleted;

        const map =
            mapRef.current;


        if (map?.isStyleLoaded()) {
            ensureMeasureLayers(map);

            updateMeasureLayer(
                map,
                measureMode,
                measurePoints
            );
        }


    }, [
        measurePoints,
        measureMode,
        measureCompleted,
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


                if (existingSource) {
                    (
                        existingSource as
                        maplibregl.GeoJSONSource
                    ).setData(
                        collection,
                    );

                    return;
                }


                ensureLandUseLayers(
                    map,
                    collection,
                    latestLayerStyleRef.current,
                );


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

    /*
    * Map View Command
    *
    * React 负责描述：
    *
    * fit-all
    * fit-current
    * fit-selected
    *
    * MapLibre 负责真正执行：
    *
    * map.fitBounds()
    */
    /*
 * Map View Command
 */
    useEffect(() => {
        const map =
            mapRef.current;


        if (
            !map ||
            !viewCommand
        ) {
            return;
        }


        /*
         * 全图
         */
        if (
            viewCommand.type ===
            "fit-all"
        ) {
            const features =
                allCollection
                    ?.features ??
                collection
                    ?.features ??
                [];


            fitMapToFeatures(
                map,
                features,
                14,
            );

            return;
        }


        /*
         * 缩放到当前筛选结果
         */
        if (
            viewCommand.type ===
            "fit-current"
        ) {
            fitMapToFeatures(
                map,
                collection
                    ?.features ??
                [],
                15,
            );

            return;
        }


        /*
         * 定位当前选中的地块
         */
        if (
            viewCommand.type ===
            "fit-selected"
        ) {
            if (
                !selectedFeatureId
            ) {
                return;
            }


            const sourceFeatures =
                allCollection
                    ?.features ??
                collection
                    ?.features ??
                [];


            const selected =
                sourceFeatures.find(
                    (feature) =>
                        feature.properties.id ===
                        selectedFeatureId,
                );


            if (!selected) {
                return;
            }


            fitMapToFeatures(
                map,
                [selected],
                17,
            );

            return;
        }


        /*
         * Day 4：
         * 业务图层上移
         */
        if (
            viewCommand.type ===
            "layer-up"
        ) {
            if (
                map.getLayer(
                    LAND_USE_FILL_LAYER_ID,
                ) &&
                map.getLayer(
                    LAND_USE_OUTLINE_LAYER_ID,
                ) &&
                map.getLayer(
                    SELECTED_FILL_LAYER_ID,
                )
            ) {
                /*
                 * 把普通业务图层移动到
                 * selection layer 的下面。
                 *
                 * selection layer 始终保持最上层。
                 */
                map.moveLayer(
                    LAND_USE_FILL_LAYER_ID,
                    SELECTED_FILL_LAYER_ID,
                );

                map.moveLayer(
                    LAND_USE_OUTLINE_LAYER_ID,
                    SELECTED_FILL_LAYER_ID,
                );
            }

            return;
        }


        /*
         * Day 4：
         * 业务图层下移
         */
        if (
            viewCommand.type ===
            "layer-down"
        ) {
            if (
                map.getLayer(
                    LAND_USE_FILL_LAYER_ID,
                ) &&
                map.getLayer(
                    LAND_USE_OUTLINE_LAYER_ID,
                )
            ) {
                map.moveLayer(
                    LAND_USE_FILL_LAYER_ID,
                    LAND_USE_OUTLINE_LAYER_ID,
                );
            }

            return;
        }

    }, [
        viewCommand,
        collection,
        allCollection,
        selectedFeatureId,
    ]);

    return (
        <div className="map-view-shell">
            <div
                ref={containerRef}
                className="map-container"
            />




            <div className="map-runtime-info">
                <span className="map-cursor-coordinate">
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
                <div className="map-coordinate-slot">
                {pickedCoordinate ? (
                    <button
                        type="button"

                        className=
                        "map-coordinate-copy"

                        onClick={() => {
                            const text =
                                `${pickedCoordinate.longitude.toFixed(
                                    6,
                                )}, ${pickedCoordinate.latitude.toFixed(
                                    6,
                                )}`;

                            void navigator.clipboard.writeText(
                                text,
                            );
                        }}
                    >
                        已拾取：
                        {pickedCoordinate.longitude.toFixed(
                            6,
                        )}
                        ,
                        {" "}
                        {pickedCoordinate.latitude.toFixed(
                            6,
                        )}
                        {" · 复制"}
                    </button>
                ) : (
                    <span>点击地图拾取坐标</span>
                )}
                </div>

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
