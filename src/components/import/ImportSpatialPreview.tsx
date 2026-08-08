import {
  MapView,
} from "../map/MapView";

import {
  DEFAULT_LAYER_STYLE,
} from "../../types/layerStyle";

import type {
  LandUseFeatureCollection,
} from "../../types/landUse";

interface ImportSpatialPreviewProps {
  collection:
    LandUseFeatureCollection;
}

export function ImportSpatialPreview({
  collection,
}: ImportSpatialPreviewProps) {
  return (
    <div className="import-spatial-preview">
      <MapView
        collection={collection}
        interactionMode="pan"
        layerStyle={{
          ...DEFAULT_LAYER_STYLE,
        }}
      />
    </div>
  );
}