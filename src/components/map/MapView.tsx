import {
    useEffect,
    useRef,
    useState,
} from "react";

import maplibregl, {
    type FilterSpecification,
    type ExpressionSpecification,
} from "maplibre-gl";
import type {
    Feature,
    GeoJsonProperties,
    LineString,
    Point,
    Polygon,
} from "geojson";

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
    Position,
} from "../../types/landUse";
import type {
    AnalysisResultLayer,
    AoiFeature,
    AoiSketchMode,
} from "../../types/analysis";
import type {
    OverlayFeatureCollection,
    OverlayLayerStyle,
    VectorGeometryKind,
    WorkspaceVectorLayer,
} from "../../types/mapLayer";
import type {
    DataQualityMapFeatureCollection,
} from "../../types/dataQuality";

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
import type { BufferFeature } from "../../services/gis/buffer";
import { MapLegend } from "./MapLegend";
import {
    calculateGeoJsonBounds,
} from "../../services/gis/calculateGeoJsonBounds";

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

const HOVER_OUTLINE_LAYER_ID =
    "land-use-hover-outline";

const SELECTION_SET_FILL_LAYER_ID =
    "selection-set-fill";

const SELECTION_SET_OUTLINE_LAYER_ID =
    "selection-set-outline";

const MEASURE_SOURCE_ID =
    "measure-source";


const MEASURE_FILL_LAYER_ID =
    "measure-fill";


const MEASURE_LINE_LAYER_ID =
    "measure-line";

const MEASURE_POINT_LAYER_ID =
    "measure-point";

const BUFFER_SOURCE_ID =
    "buffer-source";

const BUFFER_LAYER_ID =
    "buffer-fill";

const BUFFER_OUTLINE_LAYER_ID =
    "buffer-outline";

const SPATIAL_QUERY_SOURCE_ID =
    "spatial-query-source";

const SPATIAL_QUERY_FILL_LAYER_ID =
    "spatial-query-fill";

const SPATIAL_QUERY_OUTLINE_LAYER_ID =
    "spatial-query-outline";

const AOI_SOURCE_ID =
    "aoi-source";

const AOI_FILL_LAYER_ID =
    "aoi-fill";

const AOI_LINE_LAYER_ID =
    "aoi-line";

const AOI_POINT_LAYER_ID =
    "aoi-points";

const AOI_QUERY_SOURCE_ID =
    "aoi-query-source";

const AOI_QUERY_FILL_LAYER_ID =
    "aoi-query-fill";

const AOI_QUERY_OUTLINE_LAYER_ID =
    "aoi-query-outline";

const ANALYSIS_SOURCE_PREFIX =
    "analysis-source-";

const ANALYSIS_FILL_PREFIX =
    "analysis-fill-";

const ANALYSIS_LINE_PREFIX =
    "analysis-line-";

const ANALYSIS_CIRCLE_PREFIX =
    "analysis-circle-";

const OVERLAY_SOURCE_PREFIX =
    "overlay-source-";

const OVERLAY_FILL_PREFIX =
    "overlay-fill-";

const OVERLAY_LINE_PREFIX =
    "overlay-line-";

const OVERLAY_CIRCLE_PREFIX =
    "overlay-circle-";

const DATA_QUALITY_SOURCE_ID =
    "data-quality-source";
const DATA_QUALITY_FILL_LAYER_ID =
    "data-quality-fill";
const DATA_QUALITY_LINE_LAYER_ID =
    "data-quality-line";
const DATA_QUALITY_CIRCLE_LAYER_ID =
    "data-quality-circle";
const DATA_QUALITY_SELECTED_LINE_LAYER_ID =
    "data-quality-selected-line";
const DATA_QUALITY_SELECTED_CIRCLE_LAYER_ID =
    "data-quality-selected-circle";




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

    selectedFeatureIds?:
    string[];

    viewCommand?:
    MapViewCommand | null;


    measureMode?:
    MeasureMode;


    measurePoints?:
    [number, number][];

    measureCompleted?:
    boolean;

    bufferFeature?:
    BufferFeature | null;

    spatialQueryFeatures?:
    LandUseFeature[];

    aoiMode?:
    AoiSketchMode;

    aoiPoints?:
    Position[];

    aoiPolygon?:
    AoiFeature | null;

    aoiQueryFeatures?:
    LandUseFeature[];

    analysisResultLayers?:
    AnalysisResultLayer[];

    overlayLayers?:
    WorkspaceVectorLayer[];

    qualityIssueFeatures?:
    DataQualityMapFeatureCollection;

    selectedQualityIssueId?:
    string | null;

    onFeatureSelect?: (
        feature:
            LandUseFeature | null,
        options?: {
            multiSelect?: boolean;
        },
    ) => void;

    onMeasurePointAdd?:
    (
        point: [number, number]
    ) => void;

    onMeasureComplete?:
    () => void;

    onAoiPointAdd?: (
        point: Position,
    ) => void;

    onAoiComplete?:
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




const GRADUATED_NO_DATA_COLOR =
    "#cbd5e1";

function createCategorizedFillColor(
    field: LayerStyle["categorizedField"] =
        "landUseType",
): ExpressionSpecification {
    return [
        "match",

        ["get", field],

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

function createGraduatedFillColor(
    style: LayerStyle,
): string | ExpressionSpecification {
    const firstClass =
        style.graduatedClasses[0];

    if (!firstClass) {
        return GRADUATED_NO_DATA_COLOR;
    }

    const stops = style.graduatedClasses
        .slice(1)
        .flatMap((item) => [
            item.min,
            item.color,
        ]);
    const stepExpression = [
        "step",
        [
            "to-number",
            [
                "get",
                style.graduatedField,
            ],
        ],
        firstClass.color,
        ...stops,
    ] as ExpressionSpecification;

    return [
        "case",
        [
            "all",
            [
                "has",
                style.graduatedField,
            ],
            [
                "!=",
                [
                    "get",
                    style.graduatedField,
                ],
                null,
            ],
        ],
        stepExpression,
        GRADUATED_NO_DATA_COLOR,
    ] as ExpressionSpecification;
}

function createLandUseFillColor(
    style: LayerStyle,
): string | ExpressionSpecification {
    switch (style.symbologyMode) {
        case "categorized":
            return createCategorizedFillColor(
                style.categorizedField,
            );

        case "graduated":
            return createGraduatedFillColor(style);

        case "single":
            return style.fillColor;
    }
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
            createLandUseFillColor(style),
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

    if (
        map.getLayer(
            HOVER_OUTLINE_LAYER_ID,
        )
    ) {
        map.setLayoutProperty(
            HOVER_OUTLINE_LAYER_ID,
            "visibility",
            selectionVisible,
        );
    }

    for (const layerId of [
        SELECTION_SET_FILL_LAYER_ID,
        SELECTION_SET_OUTLINE_LAYER_ID,
    ]) {
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(
                layerId,
                "visibility",
                selectionVisible,
            );
        }
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

function createSelectionSetFilter(
    featureIds: string[],
): FilterSpecification {
    if (featureIds.length === 0) {
        return createEmptySelectionFilter();
    }

    return [
        "in",
        ["get", "id"],
        ["literal", featureIds],
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
                    createCategorizedFillColor(),

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

    if (!map.getLayer(SELECTION_SET_FILL_LAYER_ID)) {
        map.addLayer({
            id: SELECTION_SET_FILL_LAYER_ID,
            type: "fill",
            source: LAND_USE_SOURCE_ID,
            filter: createEmptySelectionFilter(),
            paint: {
                "fill-color": "#6366f1",
                "fill-opacity": 0.08,
            },
        });
    }

    if (!map.getLayer(SELECTION_SET_OUTLINE_LAYER_ID)) {
        map.addLayer({
            id: SELECTION_SET_OUTLINE_LAYER_ID,
            type: "line",
            source: LAND_USE_SOURCE_ID,
            filter: createEmptySelectionFilter(),
            paint: {
                "line-color": "#4f46e5",
                "line-width": 1.5,
                "line-opacity": 0.75,
            },
        });
    }


    /*
     * Hover outline
     */
    if (
        !map.getLayer(
            HOVER_OUTLINE_LAYER_ID,
        )
    ) {
        map.addLayer({
            id:
                HOVER_OUTLINE_LAYER_ID,

            type:
                "line",

            source:
                LAND_USE_SOURCE_ID,

            filter:
                createEmptySelectionFilter(),

            paint: {
                "line-color":
                    "#2dd4bf",

                "line-width":
                    3,

                "line-opacity":
                    0.95,
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

function ensureBufferLayer(
    map: maplibregl.Map,
) {
    if (!map.getSource(BUFFER_SOURCE_ID)) {
        map.addSource(BUFFER_SOURCE_ID, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [],
            },
        });
    }

    const beforeLayerId =
        map.getLayer(HOVER_OUTLINE_LAYER_ID)
            ? HOVER_OUTLINE_LAYER_ID
            : map.getLayer(SELECTED_FILL_LAYER_ID)
                ? SELECTED_FILL_LAYER_ID
                : undefined;

    if (!map.getLayer(BUFFER_LAYER_ID)) {
        map.addLayer(
            {
                id: BUFFER_LAYER_ID,
                type: "fill",
                source: BUFFER_SOURCE_ID,
                paint: {
                    "fill-color": "#14b8a6",
                    "fill-opacity": 0.11,
                },
            },
            beforeLayerId,
        );
    }

    if (!map.getLayer(BUFFER_OUTLINE_LAYER_ID)) {
        map.addLayer(
            {
                id: BUFFER_OUTLINE_LAYER_ID,
                type: "line",
                source: BUFFER_SOURCE_ID,
                paint: {
                    "line-color": "#0f766e",
                    "line-width": 1.5,
                    "line-opacity": 0.75,
                },
            },
            beforeLayerId,
        );
    }
}

function showBufferResult(
    map: maplibregl.Map,
    feature: BufferFeature,
) {
    ensureBufferLayer(map);

    const source = map.getSource(BUFFER_SOURCE_ID);

    if (source?.type === "geojson") {
        (source as maplibregl.GeoJSONSource).setData(feature);
    }
}

function clearBufferResult(
    map: maplibregl.Map,
) {
    const source = map.getSource(BUFFER_SOURCE_ID);

    if (source?.type === "geojson") {
        (source as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [],
        });
    }
}

function ensureSpatialQueryLayers(
    map: maplibregl.Map,
) {
    if (!map.getSource(SPATIAL_QUERY_SOURCE_ID)) {
        map.addSource(SPATIAL_QUERY_SOURCE_ID, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [],
            },
        });
    }

    const beforeLayerId =
        map.getLayer(HOVER_OUTLINE_LAYER_ID)
            ? HOVER_OUTLINE_LAYER_ID
            : map.getLayer(SELECTED_FILL_LAYER_ID)
                ? SELECTED_FILL_LAYER_ID
                : undefined;

    if (!map.getLayer(SPATIAL_QUERY_FILL_LAYER_ID)) {
        map.addLayer(
            {
                id: SPATIAL_QUERY_FILL_LAYER_ID,
                type: "fill",
                source: SPATIAL_QUERY_SOURCE_ID,
                paint: {
                    "fill-color": "#3b82f6",
                    "fill-opacity": 0.1,
                },
            },
            beforeLayerId,
        );
    }

    if (!map.getLayer(SPATIAL_QUERY_OUTLINE_LAYER_ID)) {
        map.addLayer(
            {
                id: SPATIAL_QUERY_OUTLINE_LAYER_ID,
                type: "line",
                source: SPATIAL_QUERY_SOURCE_ID,
                paint: {
                    "line-color": "#2563eb",
                    "line-width": 1.5,
                    "line-opacity": 0.75,
                },
            },
            beforeLayerId,
        );
    }
}

function updateSpatialQueryLayer(
    map: maplibregl.Map,
    features: LandUseFeature[],
) {
    ensureSpatialQueryLayers(map);

    const source =
        map.getSource(SPATIAL_QUERY_SOURCE_ID);

    if (source?.type === "geojson") {
        (source as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features,
        });
    }
}

function clearSpatialQueryLayer(
    map: maplibregl.Map,
) {
    const source =
        map.getSource(SPATIAL_QUERY_SOURCE_ID);

    if (source?.type === "geojson") {
        (source as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [],
        });
    }
}

type AoiRenderFeature = Feature<
    Point | LineString | Polygon,
    GeoJsonProperties
>;

function ensureAoiLayers(
    map: maplibregl.Map,
) {
    if (!map.getSource(AOI_SOURCE_ID)) {
        map.addSource(AOI_SOURCE_ID, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [],
            },
        });
    }

    const beforeLayerId =
        map.getLayer(HOVER_OUTLINE_LAYER_ID)
            ? HOVER_OUTLINE_LAYER_ID
            : map.getLayer(SELECTED_FILL_LAYER_ID)
                ? SELECTED_FILL_LAYER_ID
                : undefined;

    if (!map.getLayer(AOI_FILL_LAYER_ID)) {
        map.addLayer(
            {
                id: AOI_FILL_LAYER_ID,
                type: "fill",
                source: AOI_SOURCE_ID,
                paint: {
                    "fill-color": "#8b5cf6",
                    "fill-opacity": 0.08,
                },
            },
            beforeLayerId,
        );
    }

    if (!map.getLayer(AOI_LINE_LAYER_ID)) {
        map.addLayer(
            {
                id: AOI_LINE_LAYER_ID,
                type: "line",
                source: AOI_SOURCE_ID,
                paint: {
                    "line-color": "#7c3aed",
                    "line-width": 2,
                    "line-opacity": 0.85,
                    "line-dasharray": [
                        4,
                        3,
                    ],
                },
            },
            beforeLayerId,
        );
    }

    if (!map.getLayer(AOI_POINT_LAYER_ID)) {
        map.addLayer(
            {
                id: AOI_POINT_LAYER_ID,
                type: "circle",
                source: AOI_SOURCE_ID,
                paint: {
                    "circle-radius": 4,
                    "circle-color": "#7c3aed",
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-width": 1.5,
                },
            },
            beforeLayerId,
        );
    }
}

function updateAoiLayers(
    map: maplibregl.Map,
    mode: AoiSketchMode,
    points: Position[],
    polygon: AoiFeature | null,
) {
    ensureAoiLayers(map);

    const pointFeatures: AoiRenderFeature[] =
        points.map((point) => ({
            type: "Feature",
            properties: {},
            geometry: {
                type: "Point",
                coordinates: point,
            },
        }));
    const shapeFeatures: AoiRenderFeature[] =
        polygon
            ? [polygon]
            : mode === "drawing" && points.length >= 2
                ? [{
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: points,
                    },
                }]
                : [];
    const source = map.getSource(AOI_SOURCE_ID);

    if (source?.type === "geojson") {
        (source as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [
                ...shapeFeatures,
                ...pointFeatures,
            ],
        });
    }
}

function clearAoiLayers(
    map: maplibregl.Map,
) {
    const source = map.getSource(AOI_SOURCE_ID);

    if (source?.type === "geojson") {
        (source as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [],
        });
    }
}

function ensureAoiQueryLayers(
    map: maplibregl.Map,
) {
    if (!map.getSource(AOI_QUERY_SOURCE_ID)) {
        map.addSource(AOI_QUERY_SOURCE_ID, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [],
            },
        });
    }

    const beforeLayerId =
        map.getLayer(HOVER_OUTLINE_LAYER_ID)
            ? HOVER_OUTLINE_LAYER_ID
            : map.getLayer(SELECTED_FILL_LAYER_ID)
                ? SELECTED_FILL_LAYER_ID
                : undefined;

    if (!map.getLayer(AOI_QUERY_FILL_LAYER_ID)) {
        map.addLayer(
            {
                id: AOI_QUERY_FILL_LAYER_ID,
                type: "fill",
                source: AOI_QUERY_SOURCE_ID,
                paint: {
                    "fill-color": "#6366f1",
                    "fill-opacity": 0.09,
                },
            },
            beforeLayerId,
        );
    }

    if (!map.getLayer(AOI_QUERY_OUTLINE_LAYER_ID)) {
        map.addLayer(
            {
                id: AOI_QUERY_OUTLINE_LAYER_ID,
                type: "line",
                source: AOI_QUERY_SOURCE_ID,
                paint: {
                    "line-color": "#4f46e5",
                    "line-width": 1.5,
                    "line-opacity": 0.75,
                },
            },
            beforeLayerId,
        );
    }
}

function updateAoiQueryLayers(
    map: maplibregl.Map,
    features: LandUseFeature[],
) {
    ensureAoiQueryLayers(map);

    const source = map.getSource(AOI_QUERY_SOURCE_ID);

    if (source?.type === "geojson") {
        (source as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features,
        });
    }
}

function clearAoiQueryLayers(
    map: maplibregl.Map,
) {
    const source = map.getSource(AOI_QUERY_SOURCE_ID);

    if (source?.type === "geojson") {
        (source as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [],
        });
    }
}

function getOverlaySourceId(
    layerId: string,
) {
    return `${OVERLAY_SOURCE_PREFIX}${layerId}`;
}

function getOverlayFillLayerId(
    layerId: string,
) {
    return `${OVERLAY_FILL_PREFIX}${layerId}`;
}

function getOverlayLineLayerId(
    layerId: string,
) {
    return `${OVERLAY_LINE_PREFIX}${layerId}`;
}

function getOverlayCircleLayerId(
    layerId: string,
) {
    return `${OVERLAY_CIRCLE_PREFIX}${layerId}`;
}

function isManagedOverlayLayerId(
    layerId: string,
) {
    return layerId.startsWith(OVERLAY_FILL_PREFIX) ||
        layerId.startsWith(OVERLAY_LINE_PREFIX) ||
        layerId.startsWith(OVERLAY_CIRCLE_PREFIX);
}

function getOverlayLayerIds(
    layerId: string,
    geometryKind: VectorGeometryKind,
) {
    switch (geometryKind) {
        case "point":
            return [
                getOverlayCircleLayerId(layerId),
            ];

        case "line":
            return [
                getOverlayLineLayerId(layerId),
            ];

        case "polygon":
            return [
                getOverlayFillLayerId(layerId),
                getOverlayLineLayerId(layerId),
            ];

        case "mixed":
            return [
                getOverlayFillLayerId(layerId),
                getOverlayLineLayerId(layerId),
                getOverlayCircleLayerId(layerId),
            ];
    }
}

function createOverlayGeometryFilter(
    geometryType: "Point" | "LineString" | "Polygon",
): FilterSpecification {
    return [
        "==",
        ["geometry-type"],
        geometryType,
    ];
}

function createQualitySeverityColor(): ExpressionSpecification {
    return [
        "match",
        ["get", "severity"],
        "error",
        "#dc2626",
        "warning",
        "#d97706",
        "#64748b",
    ];
}

function ensureDataQualityLayers(
    map: maplibregl.Map,
) {
    if (!map.getSource(DATA_QUALITY_SOURCE_ID)) {
        map.addSource(DATA_QUALITY_SOURCE_ID, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [],
            },
        });
    }

    const beforeLayerId =
        map.getLayer(SPATIAL_QUERY_FILL_LAYER_ID)
            ? SPATIAL_QUERY_FILL_LAYER_ID
            : map.getLayer(AOI_QUERY_FILL_LAYER_ID)
                ? AOI_QUERY_FILL_LAYER_ID
                : map.getLayer(SELECTION_SET_FILL_LAYER_ID)
                    ? SELECTION_SET_FILL_LAYER_ID
                    : map.getLayer(HOVER_OUTLINE_LAYER_ID)
                        ? HOVER_OUTLINE_LAYER_ID
                    : map.getLayer(SELECTED_FILL_LAYER_ID)
                        ? SELECTED_FILL_LAYER_ID
                        : undefined;
    const polygonFilter = createOverlayGeometryFilter("Polygon");
    const pointFilter = createOverlayGeometryFilter("Point");
    const lineFilter = createOverlayLineFilter("mixed");
    const severityColor = createQualitySeverityColor();

    if (!map.getLayer(DATA_QUALITY_FILL_LAYER_ID)) {
        map.addLayer({
            id: DATA_QUALITY_FILL_LAYER_ID,
            type: "fill",
            source: DATA_QUALITY_SOURCE_ID,
            filter: polygonFilter,
            paint: {
                "fill-color": severityColor,
                "fill-opacity": [
                    "match",
                    ["get", "severity"],
                    "error",
                    0.11,
                    "warning",
                    0.08,
                    0.07,
                ],
            },
        }, beforeLayerId);
    }

    if (!map.getLayer(DATA_QUALITY_LINE_LAYER_ID)) {
        map.addLayer({
            id: DATA_QUALITY_LINE_LAYER_ID,
            type: "line",
            source: DATA_QUALITY_SOURCE_ID,
            filter: lineFilter,
            paint: {
                "line-color": severityColor,
                "line-width": 1.75,
                "line-opacity": 0.82,
            },
        }, beforeLayerId);
    }

    if (!map.getLayer(DATA_QUALITY_CIRCLE_LAYER_ID)) {
        map.addLayer({
            id: DATA_QUALITY_CIRCLE_LAYER_ID,
            type: "circle",
            source: DATA_QUALITY_SOURCE_ID,
            filter: pointFilter,
            paint: {
                "circle-color": severityColor,
                "circle-radius": 5,
                "circle-opacity": 0.86,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1.25,
            },
        }, beforeLayerId);
    }

    if (!map.getLayer(DATA_QUALITY_SELECTED_LINE_LAYER_ID)) {
        map.addLayer({
            id: DATA_QUALITY_SELECTED_LINE_LAYER_ID,
            type: "line",
            source: DATA_QUALITY_SOURCE_ID,
            filter: createEmptySelectionFilter(),
            paint: {
                "line-color": [
                    "match",
                    ["get", "severity"],
                    "warning",
                    "#b45309",
                    "#b91c1c",
                ],
                "line-width": 3,
                "line-opacity": 1,
            },
        }, beforeLayerId);
    }

    if (!map.getLayer(DATA_QUALITY_SELECTED_CIRCLE_LAYER_ID)) {
        map.addLayer({
            id: DATA_QUALITY_SELECTED_CIRCLE_LAYER_ID,
            type: "circle",
            source: DATA_QUALITY_SOURCE_ID,
            filter: createEmptySelectionFilter(),
            paint: {
                "circle-color": "#ffffff",
                "circle-radius": 7,
                "circle-opacity": 0.2,
                "circle-stroke-color": [
                    "match",
                    ["get", "severity"],
                    "warning",
                    "#b45309",
                    "#b91c1c",
                ],
                "circle-stroke-width": 3,
            },
        }, beforeLayerId);
    }
}

function updateDataQualityLayers(
    map: maplibregl.Map,
    collection: DataQualityMapFeatureCollection,
    selectedIssueId: string | null,
) {
    ensureDataQualityLayers(map);

    const source = map.getSource(DATA_QUALITY_SOURCE_ID);

    if (source?.type === "geojson") {
        (source as maplibregl.GeoJSONSource).setData(collection);
    }

    const selectedFilter: FilterSpecification = selectedIssueId
        ? ["==", ["get", "issueId"], selectedIssueId]
        : createEmptySelectionFilter();

    map.setFilter(DATA_QUALITY_SELECTED_LINE_LAYER_ID, selectedFilter);
    map.setFilter(DATA_QUALITY_SELECTED_CIRCLE_LAYER_ID, selectedFilter);
}

function createOverlayLineFilter(
    geometryKind: VectorGeometryKind,
): FilterSpecification {
    if (geometryKind === "mixed") {
        const lineExpression: ExpressionSpecification = [
            "==",
            ["geometry-type"],
            "LineString",
        ];
        const polygonExpression: ExpressionSpecification = [
            "==",
            ["geometry-type"],
            "Polygon",
        ];

        return [
            "any",
            lineExpression,
            polygonExpression,
        ];
    }

    return createOverlayGeometryFilter(
        geometryKind === "line"
            ? "LineString"
            : "Polygon",
    );
}

function isOverlayHigherLayer(
    layerId: string,
) {
    return layerId === MEASURE_FILL_LAYER_ID ||
        layerId === MEASURE_LINE_LAYER_ID ||
        layerId === MEASURE_POINT_LAYER_ID ||
        layerId === BUFFER_LAYER_ID ||
        layerId === BUFFER_OUTLINE_LAYER_ID ||
        layerId === AOI_FILL_LAYER_ID ||
        layerId === AOI_LINE_LAYER_ID ||
        layerId === AOI_POINT_LAYER_ID ||
        layerId === SPATIAL_QUERY_FILL_LAYER_ID ||
        layerId === SPATIAL_QUERY_OUTLINE_LAYER_ID ||
        layerId === AOI_QUERY_FILL_LAYER_ID ||
        layerId === AOI_QUERY_OUTLINE_LAYER_ID ||
        layerId === SELECTION_SET_FILL_LAYER_ID ||
        layerId === SELECTION_SET_OUTLINE_LAYER_ID ||
        layerId === DATA_QUALITY_FILL_LAYER_ID ||
        layerId === DATA_QUALITY_LINE_LAYER_ID ||
        layerId === DATA_QUALITY_CIRCLE_LAYER_ID ||
        layerId === DATA_QUALITY_SELECTED_LINE_LAYER_ID ||
        layerId === DATA_QUALITY_SELECTED_CIRCLE_LAYER_ID ||
        layerId === HOVER_OUTLINE_LAYER_ID ||
        layerId === SELECTED_FILL_LAYER_ID ||
        layerId === SELECTED_OUTLINE_LAYER_ID ||
        isManagedAnalysisLayerId(layerId);
}

function getOverlayBeforeLayerId(
    map: maplibregl.Map,
) {
    const styleLayers = map.getStyle().layers ?? [];
    const primaryLayerIndex = styleLayers.findIndex(
        (layer) =>
            layer.id === LAND_USE_OUTLINE_LAYER_ID,
    );
    const candidateLayers = primaryLayerIndex >= 0
        ? styleLayers.slice(primaryLayerIndex + 1)
        : styleLayers;

    return candidateLayers.find(
        (layer) => isOverlayHigherLayer(layer.id),
    )?.id;
}

function syncOverlayLayers(
    map: maplibregl.Map,
    layers: WorkspaceVectorLayer[],
    collectionCache: Map<
        string,
        OverlayFeatureCollection
    >,
    styleCache: Map<
        string,
        OverlayLayerStyle
    >,
    orderCache: {
        signature: string;
    },
) {
    const desiredSourceIds = new Set(
        layers.map(
            (layer) => getOverlaySourceId(layer.id),
        ),
    );
    const desiredLayerIds = new Set(
        layers.flatMap(
            (layer) => getOverlayLayerIds(
                layer.id,
                layer.geometryKind,
            ),
        ),
    );
    const currentStyle = map.getStyle();
    const obsoleteLayerIds = (
        currentStyle.layers ?? []
    )
        .map((layer) => layer.id)
        .filter(
            (layerId) =>
                isManagedOverlayLayerId(layerId) &&
                !desiredLayerIds.has(layerId),
        );
    let layerStructureChanged =
        obsoleteLayerIds.length > 0;

    for (const layerId of obsoleteLayerIds) {
        if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
        }
    }

    const obsoleteSourceIds = Object.keys(
        currentStyle.sources ?? {},
    ).filter(
        (sourceId) =>
            sourceId.startsWith(OVERLAY_SOURCE_PREFIX) &&
            !desiredSourceIds.has(sourceId),
    );

    if (obsoleteSourceIds.length > 0) {
        layerStructureChanged = true;
    }

    for (const sourceId of obsoleteSourceIds) {
        if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
        }

        collectionCache.delete(sourceId);
        styleCache.delete(sourceId);
    }

    for (const sourceId of collectionCache.keys()) {
        if (!desiredSourceIds.has(sourceId)) {
            collectionCache.delete(sourceId);
        }
    }

    for (const sourceId of styleCache.keys()) {
        if (!desiredSourceIds.has(sourceId)) {
            styleCache.delete(sourceId);
        }
    }

    const beforeLayerId = getOverlayBeforeLayerId(map);

    for (const layer of [...layers].reverse()) {
        const sourceId = getOverlaySourceId(layer.id);
        const existingSource = map.getSource(sourceId);
        const previousCollection =
            collectionCache.get(sourceId);
        const previousStyle =
            styleCache.get(sourceId);

        if (!existingSource) {
            layerStructureChanged = true;
            map.addSource(sourceId, {
                type: "geojson",
                data: layer.collection,
            });
            collectionCache.set(
                sourceId,
                layer.collection,
            );
        } else if (
            existingSource.type === "geojson" &&
            previousCollection !== layer.collection
        ) {
            (
                existingSource as maplibregl.GeoJSONSource
            ).setData(layer.collection);
            collectionCache.set(
                sourceId,
                layer.collection,
            );
        }

        const visibility = layer.style.visible
            ? "visible"
            : "none";
        const layerIds = getOverlayLayerIds(
            layer.id,
            layer.geometryKind,
        );
        const fillLayerId =
            getOverlayFillLayerId(layer.id);
        const lineLayerId =
            getOverlayLineLayerId(layer.id);
        const circleLayerId =
            getOverlayCircleLayerId(layer.id);

        if (
            layerIds.includes(fillLayerId) &&
            !map.getLayer(fillLayerId)
        ) {
            layerStructureChanged = true;
            map.addLayer(
                {
                    id: fillLayerId,
                    type: "fill",
                    source: sourceId,
                    filter: createOverlayGeometryFilter(
                        "Polygon",
                    ),
                    layout: {
                        visibility,
                    },
                    paint: {
                        "fill-color": layer.style.fillColor,
                        "fill-opacity": layer.style.opacity,
                    },
                },
                beforeLayerId,
            );
        }

        if (
            layerIds.includes(lineLayerId) &&
            !map.getLayer(lineLayerId)
        ) {
            layerStructureChanged = true;
            map.addLayer(
                {
                    id: lineLayerId,
                    type: "line",
                    source: sourceId,
                    filter: createOverlayLineFilter(
                        layer.geometryKind,
                    ),
                    layout: {
                        visibility,
                        "line-cap": "round",
                        "line-join": "round",
                    },
                    paint: {
                        "line-color": layer.style.lineColor,
                        "line-width": layer.style.lineWidth,
                        "line-opacity": layer.style.opacity,
                    },
                },
                beforeLayerId,
            );
        }

        if (
            layerIds.includes(circleLayerId) &&
            !map.getLayer(circleLayerId)
        ) {
            layerStructureChanged = true;
            map.addLayer(
                {
                    id: circleLayerId,
                    type: "circle",
                    source: sourceId,
                    filter: createOverlayGeometryFilter(
                        "Point",
                    ),
                    layout: {
                        visibility,
                    },
                    paint: {
                        "circle-color": layer.style.pointColor,
                        "circle-radius": layer.style.pointRadius,
                        "circle-opacity": layer.style.opacity,
                        "circle-stroke-color": "#ffffff",
                        "circle-stroke-width": 1,
                    },
                },
                beforeLayerId,
            );
        }

        if (
            map.getLayer(fillLayerId) &&
            previousStyle?.visible !== layer.style.visible
        ) {
            map.setLayoutProperty(
                fillLayerId,
                "visibility",
                visibility,
            );
        }

        if (
            map.getLayer(fillLayerId) &&
            previousStyle?.fillColor !== layer.style.fillColor
        ) {
            map.setPaintProperty(
                fillLayerId,
                "fill-color",
                layer.style.fillColor,
            );
        }

        if (
            map.getLayer(fillLayerId) &&
            previousStyle?.opacity !== layer.style.opacity
        ) {
            map.setPaintProperty(
                fillLayerId,
                "fill-opacity",
                layer.style.opacity,
            );
        }

        if (
            map.getLayer(lineLayerId) &&
            previousStyle?.visible !== layer.style.visible
        ) {
            map.setLayoutProperty(
                lineLayerId,
                "visibility",
                visibility,
            );
        }

        if (
            map.getLayer(lineLayerId) &&
            previousStyle?.lineColor !== layer.style.lineColor
        ) {
            map.setPaintProperty(
                lineLayerId,
                "line-color",
                layer.style.lineColor,
            );
        }

        if (
            map.getLayer(lineLayerId) &&
            previousStyle?.lineWidth !== layer.style.lineWidth
        ) {
            map.setPaintProperty(
                lineLayerId,
                "line-width",
                layer.style.lineWidth,
            );
        }

        if (
            map.getLayer(lineLayerId) &&
            previousStyle?.opacity !== layer.style.opacity
        ) {
            map.setPaintProperty(
                lineLayerId,
                "line-opacity",
                layer.style.opacity,
            );
        }

        if (
            map.getLayer(circleLayerId) &&
            previousStyle?.visible !== layer.style.visible
        ) {
            map.setLayoutProperty(
                circleLayerId,
                "visibility",
                visibility,
            );
        }

        if (
            map.getLayer(circleLayerId) &&
            previousStyle?.pointColor !== layer.style.pointColor
        ) {
            map.setPaintProperty(
                circleLayerId,
                "circle-color",
                layer.style.pointColor,
            );
        }

        if (
            map.getLayer(circleLayerId) &&
            previousStyle?.pointRadius !== layer.style.pointRadius
        ) {
            map.setPaintProperty(
                circleLayerId,
                "circle-radius",
                layer.style.pointRadius,
            );
        }

        if (
            map.getLayer(circleLayerId) &&
            previousStyle?.opacity !== layer.style.opacity
        ) {
            map.setPaintProperty(
                circleLayerId,
                "circle-opacity",
                layer.style.opacity,
            );
        }

        styleCache.set(sourceId, layer.style);
    }

    const orderedLayerIds = [...layers]
        .reverse()
        .flatMap(
            (layer) => getOverlayLayerIds(
                layer.id,
                layer.geometryKind,
            ),
        );
    const orderSignature = orderedLayerIds.join("|");

    if (
        layerStructureChanged ||
        orderCache.signature !== orderSignature
    ) {
        for (const layerId of orderedLayerIds) {
            if (map.getLayer(layerId)) {
                map.moveLayer(layerId, beforeLayerId);
            }
        }

        orderCache.signature = orderSignature;
    }
}

function getAnalysisSourceId(
    layerId: string,
) {
    return `${ANALYSIS_SOURCE_PREFIX}${layerId}`;
}

function getAnalysisFillLayerId(
    layerId: string,
) {
    return `${ANALYSIS_FILL_PREFIX}${layerId}`;
}

function getAnalysisLineLayerId(
    layerId: string,
) {
    return `${ANALYSIS_LINE_PREFIX}${layerId}`;
}

function getAnalysisCircleLayerId(
    layerId: string,
) {
    return `${ANALYSIS_CIRCLE_PREFIX}${layerId}`;
}

function isManagedAnalysisLayerId(
    layerId: string,
) {
    return layerId.startsWith(ANALYSIS_FILL_PREFIX) ||
        layerId.startsWith(ANALYSIS_LINE_PREFIX) ||
        layerId.startsWith(ANALYSIS_CIRCLE_PREFIX);
}

function syncAnalysisResultLayers(
    map: maplibregl.Map,
    layers: AnalysisResultLayer[],
) {
    const desiredSourceIds = new Set(
        layers.map(
            (layer) => getAnalysisSourceId(layer.id),
        ),
    );
    const desiredLayerIds = new Set<string>();

    for (const layer of layers) {
        if (layer.geometryType === "Point") {
            desiredLayerIds.add(
                getAnalysisCircleLayerId(layer.id),
            );
        } else {
            desiredLayerIds.add(
                getAnalysisFillLayerId(layer.id),
            );
            desiredLayerIds.add(
                getAnalysisLineLayerId(layer.id),
            );
        }
    }

    const currentStyle = map.getStyle();
    const obsoleteLayerIds =
        (currentStyle.layers ?? [])
            .map((layer) => layer.id)
            .filter(
                (layerId) =>
                    isManagedAnalysisLayerId(layerId) &&
                    !desiredLayerIds.has(layerId),
            );

    for (const layerId of obsoleteLayerIds) {
        if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
        }
    }

    const obsoleteSourceIds = Object.keys(
        currentStyle.sources ?? {},
    ).filter(
        (sourceId) =>
            sourceId.startsWith(ANALYSIS_SOURCE_PREFIX) &&
            !desiredSourceIds.has(sourceId),
    );

    for (const sourceId of obsoleteSourceIds) {
        if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
        }
    }

    const beforeLayerId =
        map.getLayer(SELECTION_SET_FILL_LAYER_ID)
            ? SELECTION_SET_FILL_LAYER_ID
            : map.getLayer(DATA_QUALITY_FILL_LAYER_ID)
            ? DATA_QUALITY_FILL_LAYER_ID
            : map.getLayer(HOVER_OUTLINE_LAYER_ID)
            ? HOVER_OUTLINE_LAYER_ID
            : map.getLayer(SELECTED_FILL_LAYER_ID)
                ? SELECTED_FILL_LAYER_ID
                : undefined;

    for (const layer of layers) {
        const sourceId =
            getAnalysisSourceId(layer.id);
        const visibility =
            layer.visible
                ? "visible"
                : "none";
        const existingSource =
            map.getSource(sourceId);

        if (!existingSource) {
            map.addSource(sourceId, {
                type: "geojson",
                data: layer.collection,
            });
        } else if (existingSource.type === "geojson") {
            (
                existingSource as
                maplibregl.GeoJSONSource
            ).setData(layer.collection);
        }

        if (layer.geometryType === "Point") {
            const circleLayerId =
                getAnalysisCircleLayerId(layer.id);

            if (!map.getLayer(circleLayerId)) {
                map.addLayer(
                    {
                        id: circleLayerId,
                        type: "circle",
                        source: sourceId,
                        layout: {
                            visibility,
                        },
                        paint: {
                            "circle-color": "#ef4444",
                            "circle-radius": 4.5,
                            "circle-opacity": 0.9,
                            "circle-stroke-color": "#ffffff",
                            "circle-stroke-width": 1.5,
                        },
                    },
                    beforeLayerId,
                );
            }

            map.setLayoutProperty(
                circleLayerId,
                "visibility",
                visibility,
            );
            continue;
        }

        const fillLayerId =
            getAnalysisFillLayerId(layer.id);
        const lineLayerId =
            getAnalysisLineLayerId(layer.id);
        const isIntersection =
            layer.operation === "intersection";

        if (!map.getLayer(fillLayerId)) {
            map.addLayer(
                {
                    id: fillLayerId,
                    type: "fill",
                    source: sourceId,
                    layout: {
                        visibility,
                    },
                    paint: {
                        "fill-color": isIntersection
                            ? "#f59e0b"
                            : "#8b5cf6",
                        "fill-opacity": isIntersection
                            ? 0.16
                            : 0.14,
                    },
                },
                beforeLayerId,
            );
        }

        if (!map.getLayer(lineLayerId)) {
            map.addLayer(
                {
                    id: lineLayerId,
                    type: "line",
                    source: sourceId,
                    layout: {
                        visibility,
                    },
                    paint: {
                        "line-color": isIntersection
                            ? "#d97706"
                            : "#7c3aed",
                        "line-width": 1.5,
                        "line-opacity": 0.85,
                    },
                },
                beforeLayerId,
            );
        }

        map.setLayoutProperty(
            fillLayerId,
            "visibility",
            visibility,
        );
        map.setLayoutProperty(
            lineLayerId,
            "visibility",
            visibility,
        );
    }
}

export function MapView({
    collection,
    allCollection,
    interactionMode,
    layerStyle,
    basemap = "dark",
    selectedFeatureId = null,
    selectedFeatureIds = [],
    viewCommand = null,
    measureMode = "none",
    measurePoints = [],
    measureCompleted = false,
    bufferFeature = null,
    spatialQueryFeatures = [],
    aoiMode = "idle",
    aoiPoints = [],
    aoiPolygon = null,
    aoiQueryFeatures = [],
    analysisResultLayers = [],
    overlayLayers = [],
    qualityIssueFeatures = {
        type: "FeatureCollection",
        features: [],
    },
    selectedQualityIssueId = null,
    onFeatureSelect,
    onMeasurePointAdd,
    onMeasureComplete,
    onAoiPointAdd,
    onAoiComplete,
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

    const latestSelectedFeatureIdsRef =
        useRef<string[]>(selectedFeatureIds);

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

    const latestBufferFeatureRef =
        useRef<BufferFeature | null>(bufferFeature);

    const latestSpatialQueryFeaturesRef =
        useRef<LandUseFeature[]>(spatialQueryFeatures);

    const latestAoiModeRef =
        useRef<AoiSketchMode>(aoiMode);

    const latestAoiPointsRef =
        useRef<Position[]>(aoiPoints);

    const latestAoiPolygonRef =
        useRef<AoiFeature | null>(aoiPolygon);

    const latestAoiQueryFeaturesRef =
        useRef<LandUseFeature[]>(aoiQueryFeatures);

    const latestAnalysisResultLayersRef =
        useRef<AnalysisResultLayer[]>(
            analysisResultLayers,
        );

    const latestOverlayLayersRef =
        useRef<WorkspaceVectorLayer[]>(overlayLayers);

    const latestQualityIssueFeaturesRef =
        useRef<DataQualityMapFeatureCollection>(
            qualityIssueFeatures,
        );

    const latestSelectedQualityIssueIdRef =
        useRef<string | null>(selectedQualityIssueId);

    const overlayCollectionCacheRef = useRef(
        new Map<
            string,
            OverlayFeatureCollection
        >(),
    );

    const overlayStyleCacheRef = useRef(
        new Map<
            string,
            OverlayLayerStyle
        >(),
    );

    const overlayOrderCacheRef = useRef({
        signature: "",
    });

    const latestOnAoiPointAddRef =
        useRef(onAoiPointAdd);

    const latestOnAoiCompleteRef =
        useRef(onAoiComplete);

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

        const clearHover = () => {
            if (
                map.getLayer(
                    HOVER_OUTLINE_LAYER_ID,
                )
            ) {
                map.setFilter(
                    HOVER_OUTLINE_LAYER_ID,
                    createEmptySelectionFilter(),
                );
            }
        };


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

            if (
                latestAoiModeRef.current === "drawing" ||
                latestMeasureModeRef.current !== "none" ||
                !map.getLayer(LAND_USE_FILL_LAYER_ID) ||
                !map.getLayer(HOVER_OUTLINE_LAYER_ID)
            ) {
                clearHover();
                return;
            }

            const hoveredFeature =
                map.queryRenderedFeatures(
                    event.point,
                    {
                        layers: [
                            LAND_USE_FILL_LAYER_ID,
                        ],
                    },
                )[0];

            const hoveredFeatureId =
                hoveredFeature?.properties?.id;

            map.setFilter(
                HOVER_OUTLINE_LAYER_ID,
                typeof hoveredFeatureId === "string"
                    ? [
                        "==",
                        ["get", "id"],
                        hoveredFeatureId,
                    ]
                    : createEmptySelectionFilter(),
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
                latestAoiModeRef.current === "drawing"
            ) {
                if (event.originalEvent.detail < 2) {
                    latestOnAoiPointAddRef.current?.([
                        event.lngLat.lng,
                        event.lngLat.lat,
                    ]);
                }

                return;
            }

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
                if (
                    event.originalEvent.ctrlKey ||
                    event.originalEvent.metaKey
                ) {
                    return;
                }

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
                latestCollectionRef.current
                    ?.features
                    .find(
                        (feature) =>
                            feature.properties.id ===
                            featureId,
                    );


            latestOnFeatureSelectRef
                .current?.(
                    selected ?? null,
                    {
                        multiSelect:
                            event.originalEvent.ctrlKey ||
                            event.originalEvent.metaKey,
                    },
                );
        };

        const handleMapDoubleClick = (
            event: maplibregl.MapMouseEvent,
        ) => {
            if (
                latestAoiModeRef.current === "drawing"
            ) {
                event.preventDefault();
                latestOnAoiCompleteRef.current?.();
                return;
            }

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

        container.addEventListener(
            "mouseleave",
            clearHover,
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

            container.removeEventListener(
                "mouseleave",
                clearHover,
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

        latestOnAoiPointAddRef.current =
            onAoiPointAdd;

        latestOnAoiCompleteRef.current =
            onAoiComplete;

        latestSelectedFeatureIdRef.current =
            selectedFeatureId;
        latestSelectedFeatureIdsRef.current =
            selectedFeatureIds;
    }, [
        onFeatureSelect,
        onMeasurePointAdd,
        onMeasureComplete,
        onAoiPointAdd,
        onAoiComplete,
        selectedFeatureId,
        selectedFeatureIds,
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

                syncOverlayLayers(
                    map,
                    latestOverlayLayersRef.current,
                    overlayCollectionCacheRef.current,
                    overlayStyleCacheRef.current,
                    overlayOrderCacheRef.current,
                );

                if (latestBufferFeatureRef.current) {
                    showBufferResult(
                        map,
                        latestBufferFeatureRef.current,
                    );
                }

                if (
                    latestSpatialQueryFeaturesRef.current.length > 0
                ) {
                    updateSpatialQueryLayer(
                        map,
                        latestSpatialQueryFeaturesRef.current,
                    );
                }

                if (
                    latestAoiModeRef.current !== "idle" &&
                    latestAoiPointsRef.current.length > 0
                ) {
                    updateAoiLayers(
                        map,
                        latestAoiModeRef.current,
                        latestAoiPointsRef.current,
                        latestAoiPolygonRef.current,
                    );
                }

                if (
                    latestAoiQueryFeaturesRef.current.length > 0
                ) {
                    updateAoiQueryLayers(
                        map,
                        latestAoiQueryFeaturesRef.current,
                    );
                }

                syncAnalysisResultLayers(
                    map,
                    latestAnalysisResultLayersRef.current,
                );

                updateDataQualityLayers(
                    map,
                    latestQualityIssueFeaturesRef.current,
                    latestSelectedQualityIssueIdRef.current,
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

                const selectionSetFilter = createSelectionSetFilter(
                    latestSelectedFeatureIdsRef.current,
                );

                map.setFilter(
                    SELECTION_SET_FILL_LAYER_ID,
                    selectionSetFilter,
                );
                map.setFilter(
                    SELECTION_SET_OUTLINE_LAYER_ID,
                    selectionSetFilter,
                );
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

            if (
                measureMode !== "none" &&
                map.getLayer(HOVER_OUTLINE_LAYER_ID)
            ) {
                map.setFilter(
                    HOVER_OUTLINE_LAYER_ID,
                    createEmptySelectionFilter(),
                );
            }

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

    useEffect(() => {
        latestBufferFeatureRef.current =
            bufferFeature;

        const map = mapRef.current;

        if (!map) {
            return;
        }

        if (!bufferFeature) {
            clearBufferResult(map);
            return;
        }

        if (!map.isStyleLoaded()) {
            return;
        }

        showBufferResult(
            map,
            bufferFeature,
        );
    }, [
        bufferFeature,
    ]);

    useEffect(() => {
        latestSpatialQueryFeaturesRef.current =
            spatialQueryFeatures;

        const map = mapRef.current;

        if (!map) {
            return;
        }

        if (spatialQueryFeatures.length === 0) {
            clearSpatialQueryLayer(map);
            return;
        }

        if (!map.isStyleLoaded()) {
            return;
        }

        updateSpatialQueryLayer(
            map,
            spatialQueryFeatures,
        );
    }, [
        spatialQueryFeatures,
    ]);

    useEffect(() => {
        latestAoiModeRef.current = aoiMode;
        latestAoiPointsRef.current = aoiPoints;
        latestAoiPolygonRef.current = aoiPolygon;

        const map = mapRef.current;

        if (!map) {
            return;
        }

        if (
            aoiMode === "idle" ||
            aoiPoints.length === 0
        ) {
            clearAoiLayers(map);
            return;
        }

        if (!map.isStyleLoaded()) {
            return;
        }

        updateAoiLayers(
            map,
            aoiMode,
            aoiPoints,
            aoiPolygon,
        );
    }, [
        aoiMode,
        aoiPoints,
        aoiPolygon,
    ]);

    useEffect(() => {
        latestAoiQueryFeaturesRef.current =
            aoiQueryFeatures;

        const map = mapRef.current;

        if (!map) {
            return;
        }

        if (aoiQueryFeatures.length === 0) {
            clearAoiQueryLayers(map);
            return;
        }

        if (!map.isStyleLoaded()) {
            return;
        }

        updateAoiQueryLayers(
            map,
            aoiQueryFeatures,
        );
    }, [
        aoiQueryFeatures,
    ]);

    useEffect(() => {
        latestOverlayLayersRef.current = overlayLayers;

        const map = mapRef.current;

        if (!map?.isStyleLoaded()) {
            return;
        }

        syncOverlayLayers(
            map,
            overlayLayers,
            overlayCollectionCacheRef.current,
            overlayStyleCacheRef.current,
            overlayOrderCacheRef.current,
        );
    }, [
        overlayLayers,
    ]);

    useEffect(() => {
        latestAnalysisResultLayersRef.current =
            analysisResultLayers;

        const map = mapRef.current;

        if (!map?.isStyleLoaded()) {
            return;
        }

        syncAnalysisResultLayers(
            map,
            analysisResultLayers,
        );
    }, [
        analysisResultLayers,
    ]);

    useEffect(() => {
        latestQualityIssueFeaturesRef.current =
            qualityIssueFeatures;
        latestSelectedQualityIssueIdRef.current =
            selectedQualityIssueId;

        const map = mapRef.current;

        if (!map?.isStyleLoaded()) {
            return;
        }

        updateDataQualityLayers(
            map,
            qualityIssueFeatures,
            selectedQualityIssueId,
        );
    }, [
        qualityIssueFeatures,
        selectedQualityIssueId,
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

                    syncOverlayLayers(
                        map,
                        latestOverlayLayersRef.current,
                        overlayCollectionCacheRef.current,
                        overlayStyleCacheRef.current,
                        overlayOrderCacheRef.current,
                    );

                    syncAnalysisResultLayers(
                        map,
                        latestAnalysisResultLayersRef.current,
                    );

                    updateDataQualityLayers(
                        map,
                        latestQualityIssueFeaturesRef.current,
                        latestSelectedQualityIssueIdRef.current,
                    );

                    return;
                }


                ensureLandUseLayers(
                    map,
                    collection,
                    latestLayerStyleRef.current,
                );

                syncOverlayLayers(
                    map,
                    latestOverlayLayersRef.current,
                    overlayCollectionCacheRef.current,
                    overlayStyleCacheRef.current,
                    overlayOrderCacheRef.current,
                );

                syncAnalysisResultLayers(
                    map,
                    latestAnalysisResultLayersRef.current,
                );

                updateDataQualityLayers(
                    map,
                    latestQualityIssueFeaturesRef.current,
                    latestSelectedQualityIssueIdRef.current,
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

        if (aoiMode === "drawing") {
            map.dragPan.disable();

            canvas.style.cursor =
                "crosshair";

            return;
        }


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
        aoiMode,
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

    useEffect(() => {
        latestSelectedFeatureIdsRef.current = selectedFeatureIds;
        const map = mapRef.current;

        if (
            !map ||
            !map.getLayer(SELECTION_SET_FILL_LAYER_ID) ||
            !map.getLayer(SELECTION_SET_OUTLINE_LAYER_ID)
        ) {
            return;
        }

        const filter = createSelectionSetFilter(selectedFeatureIds);
        map.setFilter(SELECTION_SET_FILL_LAYER_ID, filter);
        map.setFilter(SELECTION_SET_OUTLINE_LAYER_ID, filter);
    }, [
        selectedFeatureIds,
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

        if (viewCommand.type === "fit-selection") {
            const selectedIds = new Set(selectedFeatureIds);
            const selected = (
                allCollection?.features ?? collection?.features ?? []
            ).filter((feature) =>
                selectedIds.has(feature.properties.id),
            );

            if (selected.length === 0) {
                return;
            }

            fitMapToFeatures(map, selected, 17);
            return;
        }

        if (
            viewCommand.type === "fit-overlay"
        ) {
            const overlayLayer =
                latestOverlayLayersRef.current.find(
                (layer) =>
                    layer.id === viewCommand.layerId,
            );

            if (!overlayLayer) {
                return;
            }

            const bounds = calculateGeoJsonBounds(
                overlayLayer.collection,
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
                    maxZoom: 17,
                },
            );

            return;
        }

        if (
            viewCommand.type === "fit-quality-issue"
        ) {
            const issueFeature = qualityIssueFeatures.features.find(
                (feature) =>
                    feature.properties.issueId === viewCommand.issueId,
            );

            if (!issueFeature) {
                return;
            }

            if (issueFeature.geometry.type === "Point") {
                map.easeTo({
                    center: [
                        issueFeature.geometry.coordinates[0],
                        issueFeature.geometry.coordinates[1],
                    ],
                    zoom: Math.max(map.getZoom(), 16),
                    duration: 650,
                });
                return;
            }

            const bounds = calculateGeoJsonBounds({
                type: "FeatureCollection",
                features: [issueFeature],
            });

            if (!bounds) {
                return;
            }

            map.fitBounds(
                [
                    [bounds.minLongitude, bounds.minLatitude],
                    [bounds.maxLongitude, bounds.maxLatitude],
                ],
                {
                    padding: 86,
                    duration: 650,
                    maxZoom: 17,
                },
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
                const beforeLayerId = map.getLayer(
                    SELECTION_SET_FILL_LAYER_ID,
                )
                    ? SELECTION_SET_FILL_LAYER_ID
                    : SELECTED_FILL_LAYER_ID;
                /*
                 * 把普通业务图层移动到
                 * selection layer 的下面。
                 *
                 * selection layer 始终保持最上层。
                 */
                map.moveLayer(
                    LAND_USE_FILL_LAYER_ID,
                    beforeLayerId,
                );

                map.moveLayer(
                    LAND_USE_OUTLINE_LAYER_ID,
                    beforeLayerId,
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
        selectedFeatureIds,
        qualityIssueFeatures,
    ]);

    return (
        <div className="map-view-shell">
            <div
                ref={containerRef}
                className="map-container"
            />

            <MapLegend style={layerStyle} />

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
