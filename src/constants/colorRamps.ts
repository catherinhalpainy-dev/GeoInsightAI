import type {
    ColorRampName,
    GraduatedClassCount,
} from "../types/layerStyle";

export interface ColorRampDefinition {
    id: ColorRampName;
    label: string;
    colors: readonly string[];
}

export const COLOR_RAMPS: readonly ColorRampDefinition[] = [
    {
        id: "teal",
        label: "Teal",
        colors: [
            "#ccfbf1",
            "#99f6e4",
            "#5eead4",
            "#2dd4bf",
            "#14b8a6",
            "#0f766e",
        ],
    },
    {
        id: "blue",
        label: "Blue",
        colors: [
            "#eff6ff",
            "#dbeafe",
            "#bfdbfe",
            "#93c5fd",
            "#60a5fa",
            "#2563eb",
        ],
    },
    {
        id: "green",
        label: "Green",
        colors: [
            "#ecfdf5",
            "#d1fae5",
            "#a7f3d0",
            "#6ee7b7",
            "#34d399",
            "#047857",
        ],
    },
    {
        id: "orange",
        label: "Orange",
        colors: [
            "#fff7ed",
            "#ffedd5",
            "#fed7aa",
            "#fdba74",
            "#fb923c",
            "#c2410c",
        ],
    },
    {
        id: "purple",
        label: "Purple",
        colors: [
            "#f5f3ff",
            "#ede9fe",
            "#ddd6fe",
            "#c4b5fd",
            "#a78bfa",
            "#7c3aed",
        ],
    },
];

export function getColorRampColors(
    rampName: ColorRampName,
    classCount: GraduatedClassCount,
): string[] {
    const ramp =
        COLOR_RAMPS.find(
            (item) => item.id === rampName,
        ) ?? COLOR_RAMPS[0];

    return Array.from(
        { length: classCount },
        (_, index) => {
            const sourceIndex = Math.round(
                index *
                (ramp.colors.length - 1) /
                Math.max(classCount - 1, 1),
            );

            return ramp.colors[sourceIndex];
        },
    );
}
