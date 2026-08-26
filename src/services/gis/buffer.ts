import { area } from "@turf/area";
import { buffer } from "@turf/buffer";
import type {
    Feature,
    GeoJsonProperties,
    Polygon,
} from "geojson";

export type BufferFeature = Feature<Polygon, GeoJsonProperties>;

export function createBuffer<Properties extends object | null>(
    feature: Feature<Polygon, Properties>,
    distance: number,
): BufferFeature {
    if (!Number.isFinite(distance) || distance <= 0) {
        throw new Error("缓冲距离必须是大于 0 的有效数字");
    }

    const turfFeature =
        feature as Feature<Polygon, GeoJsonProperties>;

    const buffered = buffer(
        turfFeature,
        distance,
        {
            units: "meters",
        },
    );

    if (!buffered) {
        throw new Error("无法根据当前要素生成缓冲区");
    }

    if (buffered.geometry.type !== "Polygon") {
        throw new Error("当前要素生成了多部件缓冲区，暂不支持显示");
    }

    return buffered as BufferFeature;
}

export function calculateBufferAreaM2(
    feature: BufferFeature,
) {
    return area(feature);
}
