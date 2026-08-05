// 为什么maplibre初始化要放在 useEffect里？
// 因为创建 MapLibre 实例属于副作用，它需要在 DOM 已挂载之后访问容器节点，并且组件卸载时需要清理地图实例，因此适合使用 useEffect 管理生命周期。
import { useEffect, useRef } from "react";
// 两个hook
// useEffect：处理副作用（创建地图实例、操作DOM、注册maplibre内部事件、销毁地图）
// useRef：保存可以跨多次渲染存在的引用（地图实例、容器节点）
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LandUseFeatureCollection } from "../../types/landUse";
import { LAND_USE_COLORS } from "../../constants/landUse";
import { calculateLandUseBounds } from "../../utils/calculateLandUseBounds";


interface MapViewProps {
    collection?: LandUseFeatureCollection;
}
export function MapView({ collection }: MapViewProps) {
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

    // 1.创建地图
    useEffect(() => {
        if (!containerRef.current) {
            return;
        }
        // 为什么不直接写在组件函数内？
        // 创建地图依赖真实DOM，组件函数第一次执行时，DOM没有挂载

        // 创建地图实例
        const map = new maplibregl.Map({
            // 把地图渲染到这个<div>DOM中
            container: containerRef.current,
            style:
                "https://demotiles.maplibre.org/style.json",
            center: [116.38, 39.92],
            zoom: 9,
        });

        // 保存地图实例
        // 局部变量map：当前effect内可使用
        // mapRef.current：跨多次渲染都可使用
        mapRef.current = map;

        // useEffect中返回的函数——清理函数，组件卸载时执行
        return () => {
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
                id: "land-use-fill",
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
                id: "land-use-outline",
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

    return (
        // 该div就是地图容器
        <div
            ref={containerRef}
            className="map-container"
        />
    );
}