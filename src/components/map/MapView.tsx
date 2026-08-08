// 为什么maplibre初始化要放在 useEffect里？
// 因为创建 MapLibre 实例属于副作用，它需要在 DOM 已挂载之后访问容器节点，并且组件卸载时需要清理地图实例，因此适合使用 useEffect 管理生命周期。
import { useEffect, useRef, useState } from "react";
// 两个hook
// useEffect：处理副作用（创建地图实例、操作DOM、注册maplibre内部事件、销毁地图）
// useRef：保存可以跨多次渲染存在的引用（地图实例、容器节点）
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LandUseFeatureCollection } from "../../types/landUse";
import { LAND_USE_COLORS, LAND_USE_FILL_LAYER_ID, LAND_USE_OUTLINE_LAYER_ID } from "../../constants/landUse";
import { calculateLandUseBounds } from "../../utils/calculateLandUseBounds";
import type { WorkspaceTool } from "../../types/workspace";
import type { LayerStyle } from "../../types/layerStyle";
// import { LayerStylePanel } from "../layers/LayerStylePanel";


interface MapViewProps {
    collection?: LandUseFeatureCollection;
    interactionMode: WorkspaceTool;
    layerStyle: LayerStyle;
}

interface MapRuntimeInfo {
    longitude: number | null;
    latitude: number | null;
    zoom: number;
}

// 图层显示隐藏
function updateLayerVisible(map: maplibregl.Map, layerStyle:LayerStyle) {
    
    const layerIDs = [
        LAND_USE_FILL_LAYER_ID,
        LAND_USE_OUTLINE_LAYER_ID,
    ];
    // map:返回新数组
    // foreach:不返回新数组，只执行动作
    layerIDs.forEach((layerID) => {
        if (!map.getLayer(layerID)) {
            return;
        }
        map.setLayoutProperty(
            LAND_USE_FILL_LAYER_ID,
            "visibility",
            layerStyle.fillVisible
            ?"visible"
            :"none",
        );
        map.setLayoutProperty(
            LAND_USE_OUTLINE_LAYER_ID,
            "visibility",
            layerStyle.outlineVisible
            ?"visible"
            :"none",
        );

    })

}
export function MapView({ collection,  interactionMode, layerStyle }: MapViewProps) {
    // 为什么这里不用useState？
    // 因为这里只是为了保存对象引用，不是为了控制页面JSX显示
    // useState：数据改变，会触发组件重新渲染
    // useRef：保存某个值/DOM/实例，数据改变，不会触发组件重新渲染
    const containerRef =
        useRef<HTMLDivElement | null>(null);
    // containerRef：保存div DOM
    // mapRef:保存地图实例
    const mapRef =
        useRef<maplibregl.Map | null>(null);

    const latestCollectionRef =
        useRef(collection);


    const [runtimeInfo, setRuntimeInfo,] = useState<MapRuntimeInfo>({
        longitude: null,
        latitude: null,
        zoom: 0
    });

    // 1.创建地图
    // 监听鼠标经纬度与zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        // 为什么不直接写在组件函数内？
        // 创建地图依赖真实DOM，组件函数第一次执行时，DOM没有挂载

        // 创建地图实例
        const map = new maplibregl.Map({
            // 把地图渲染到这个<div>DOM中
            container: container,
            style:
                "https://demotiles.maplibre.org/style.json",
            center: [116.38, 39.92],
            zoom: 9,
        });

        // 保存地图实例
        // 局部变量map：当前effect内可使用
        // mapRef.current：跨多次渲染都可使用
        mapRef.current = map;

        const resizeObserver =
            new ResizeObserver(() => {
                map.resize();
            });

        resizeObserver.observe(container,);

        // 保存鼠标移动
        const handleMouseMove = (event: maplibregl.MapMouseEvent,) => {
            setRuntimeInfo((previous) => {
                return {
                    ...previous,
                    longitude:
                        event.lngLat.lng,
                    latitude:
                        event.lngLat.lat,
                };
            });
        };

        const handleZoomEnd = () => {
            setRuntimeInfo((previous) => {
                return {
                    ...previous,
                    zoom: map.getZoom(),
                };
            });
        };


        map.on(
            "mousemove",
            handleMouseMove,
        );

        map.on(
            "zoomend",
            handleZoomEnd,
        );
        // useEffect中返回的函数——清理函数，组件卸载时执行
        return () => {
            map.off(
                "mousemove",
                handleMouseMove,
            );

            map.off(
                "zoomend",
                handleZoomEnd,
            );
            resizeObserver.disconnect();
            map.remove();
            mapRef.current = null;
        };
        // []：空依赖数组，该effect不依赖组件里的变化值
    }, []);


    // 2.collection变化时，更新地图数据
    useEffect(() => {

        const map = mapRef.current;
        if (!map || !collection) {
            return;
        }

        const updateSource = () => {
            const existingSource =
                map.getSource("land-use-source");
            if (existingSource) {
                (existingSource as maplibregl.GeoJSONSource).setData(
                    collection,
                );
                return;
            };

            // map.addSource(
            //   数据源ID,
            //   数据源配置,
            // );
            map.addSource("land-use-source", {
                type: "geojson",
                data: latestCollectionRef.current,
            });

            map.addLayer({
                id: LAND_USE_FILL_LAYER_ID,
                type: "fill",
                source: "land-use-source",
                paint: {
                    // 数据驱动样式
                    "fill-color": [
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
                    ],
                    "fill-opacity": 0.68,
                },
            });
            map.addLayer({
                id: LAND_USE_OUTLINE_LAYER_ID,
                type: "line",
                source: "land-use-source",
                paint: {
                    "line-color": "#ffffff",
                    "line-width": 1,
                },
            });
            map.addControl(
                new maplibregl.NavigationControl(),
                "top-right",
            );

            const bounds = calculateLandUseBounds(
                collection.features,
            );
            if (bounds) {
                map.fitBounds(
                    [
                        [bounds.minLongitude,
                        bounds.minLatitude,
                        ],
                        [bounds.maxLongitude,
                        bounds.maxLatitude,
                        ],
                    ],
                    {
                        padding: 48,
                        duration: 0,
                    }
                );
            }



        };

        if (map.isStyleLoaded()) {
            updateSource();
        } else {
            map.once("load", updateSource);
        }

        return () => {
            map.off("load", updateSource);
        };

    }, [collection]);

    // 3.
    useEffect(() => {
        latestCollectionRef.current =
            collection;

        const map = mapRef.current;

        if (!map) {
            return;
        }

        const source =
            map.getSource(
                "land-use",
            ) as
            | maplibregl.GeoJSONSource
            | undefined;

        if (!source) {
            return;
        }

        source.setData(collection);
    }, [collection]);



    // 5.选择平移工具
    useEffect(() => {
        const map = mapRef.current;
        if (!map) {
            return;
        }

        const canvas =
            map.getCanvas();

        if (interactionMode == "pan") {
            map.dragPan.enable();
            canvas.style.cursor = "grab";
            return;
        }
        map.dragPan.disable();
        canvas.style.cursor =
            "crosshair";
    }, [interactionMode]);
    
    
   
    // 6.样式同步 合并 4.显示隐藏
    useEffect(() => {
        const map = mapRef.current;
        if (!map) {
            return;
        }
        updateLayerVisible(map,layerStyle);
        if (
            map.getLayer(
                LAND_USE_FILL_LAYER_ID,
            )
        ) {
            // 修改fill
            const fillColor =
                layerStyle.colorMode === "classified"
                    ? [
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
                    ]
                    : layerStyle.fillColor;

            map.setPaintProperty(LAND_USE_FILL_LAYER_ID, "fill-color", fillColor);

            // 透明度
            map.setPaintProperty(LAND_USE_FILL_LAYER_ID, "fill-opacity", layerStyle.fillOpacity);

        }

        if (map.getLayer(LAND_USE_OUTLINE_LAYER_ID,)) {
            // 修改outline
            map.setPaintProperty(LAND_USE_OUTLINE_LAYER_ID, "line-color", layerStyle.outlineColor);
            map.setPaintProperty(LAND_USE_OUTLINE_LAYER_ID, "line-width", layerStyle.outlineWidth);
            map.setPaintProperty(LAND_USE_OUTLINE_LAYER_ID, "line-opacity", layerStyle.outlineOpacity);
        }
    }, [layerStyle]);

    return (
        // 该div就是地图容器
        <div className="map-view-shell">
            <div
                ref={containerRef}
                className="map-container"
            />

            <div className="map-runtime-info">
                <span>
                    {/* toFixed(n)保留n位小数，返回string */}
                    {runtimeInfo.longitude !== null &&
                        runtimeInfo.latitude !== null
                        ? `${runtimeInfo.longitude.toFixed(
                            5,
                        )}度,
                    ${runtimeInfo.latitude.toFixed(5,)}度`
                        : "移动鼠标查看坐标"
                    }
                </span>

                <span>
                    zoom:
                    {runtimeInfo.zoom.toFixed(1)}
                </span>

                <span>
                    当前要素：
                    {collection?.features.length}
                </span>

                <span>
                    图层：
                    {
                        layerStyle.fillVisible
                            ? "显示"
                            : "隐藏"
                    }
                </span>

            </div>
        </div>
    );
}