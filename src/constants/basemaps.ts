import type { BasemapType } from "../types/workspace";

export const BASEMAP_STYLES: Record<BasemapType, string> = {
    dark: "https://tiles.openfreemap.org/styles/dark",
    light: "https://tiles.openfreemap.org/styles/positron",
    blank: "/map_style_blank.json",
};
