import type {
    FeatureCollection,
    GeoJsonProperties,
    Geometry,
} from "geojson";

export function exportFeatureCollection<
    GeometryType extends Geometry,
    Properties extends GeoJsonProperties,
>(
    collection: FeatureCollection<
        GeometryType,
        Properties
    >,
    filename: string,
) {
    const json = JSON.stringify(
        collection,
        null,
        2,
    );
    const blob = new Blob(
        [json],
        {
            type: "application/geo+json;charset=utf-8",
        },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
}
