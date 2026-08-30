import type {
    LandUseFeature,
} from "../../types/landUse";
import type {
    ClassificationMethod,
    GraduatedClass,
    GraduatedField,
} from "../../types/layerStyle";

export interface GraduatedClassOptions {
    field: GraduatedField;
    method: ClassificationMethod;
    classCount: number;
    colors: readonly string[];
}

const DEFAULT_CLASS_COLOR = "#0f766e";

function getSafeValues(
    values: readonly number[],
): number[] {
    return values
        .filter((value) => Number.isFinite(value))
        .slice()
        .sort((left, right) => left - right);
}

function getEffectiveClassCount(
    values: readonly number[],
    requestedClassCount: number,
): number {
    const normalizedCount = Math.max(
        1,
        Math.floor(requestedClassCount),
    );
    const uniqueValueCount =
        new Set(values).size;

    return Math.min(
        normalizedCount,
        values.length,
        uniqueValueCount,
    );
}

function getClassColor(
    colors: readonly string[],
    index: number,
    classTotal: number,
): string {
    if (colors.length === 0) {
        return DEFAULT_CLASS_COLOR;
    }

    if (classTotal <= 1) {
        return colors[
            Math.floor((colors.length - 1) / 2)
        ];
    }

    const colorIndex = Math.round(
        index *
        (colors.length - 1) /
        (classTotal - 1),
    );

    return colors[colorIndex];
}

function formatBoundary(
    value: number,
    maximumFractionDigits: number,
): string {
    return new Intl.NumberFormat(
        "zh-CN",
        {
            maximumFractionDigits,
        },
    ).format(value);
}

function createLabel(
    min: number,
    max: number,
    maximumFractionDigits = 2,
): string {
    if (min === max) {
        return formatBoundary(
            min,
            maximumFractionDigits,
        );
    }

    return `${formatBoundary(min, maximumFractionDigits)} – ${formatBoundary(max, maximumFractionDigits)}`;
}

export function getNumericFieldValues(
    features: readonly LandUseFeature[],
    field: GraduatedField,
): number[] {
    const values: number[] = [];

    for (const feature of features) {
        const value = feature.properties[field];

        if (
            typeof value === "number" &&
            Number.isFinite(value)
        ) {
            values.push(value);
        }
    }

    return values;
}

export function createEqualIntervalClasses(
    values: readonly number[],
    classCount: number,
    colors: readonly string[],
): GraduatedClass[] {
    const sortedValues = getSafeValues(values);

    if (sortedValues.length === 0) {
        return [];
    }

    const effectiveClassCount =
        getEffectiveClassCount(
            sortedValues,
            classCount,
        );
    const minimum = sortedValues[0];
    const maximum =
        sortedValues[sortedValues.length - 1];

    if (
        effectiveClassCount === 1 ||
        minimum === maximum
    ) {
        return [{
            min: minimum,
            max: maximum,
            color: getClassColor(
                colors,
                0,
                1,
            ),
            label: createLabel(
                minimum,
                maximum,
            ),
        }];
    }

    const interval =
        (maximum - minimum) /
        effectiveClassCount;

    return Array.from(
        { length: effectiveClassCount },
        (_, index) => {
            const classMinimum =
                minimum + interval * index;
            const classMaximum =
                index === effectiveClassCount - 1
                    ? maximum
                    : minimum + interval * (index + 1);

            return {
                min: classMinimum,
                max: classMaximum,
                color: getClassColor(
                    colors,
                    index,
                    effectiveClassCount,
                ),
                label: createLabel(
                    classMinimum,
                    classMaximum,
                ),
            };
        },
    );
}

export function createQuantileClasses(
    values: readonly number[],
    classCount: number,
    colors: readonly string[],
): GraduatedClass[] {
    const sortedValues = getSafeValues(values);

    if (sortedValues.length === 0) {
        return [];
    }

    const effectiveClassCount =
        getEffectiveClassCount(
            sortedValues,
            classCount,
        );
    const minimum = sortedValues[0];
    const maximum =
        sortedValues[sortedValues.length - 1];

    if (
        effectiveClassCount === 1 ||
        minimum === maximum
    ) {
        return [{
            min: minimum,
            max: maximum,
            color: getClassColor(
                colors,
                0,
                1,
            ),
            label: createLabel(
                minimum,
                maximum,
            ),
        }];
    }

    const classStarts: number[] = [minimum];

    for (
        let index = 1;
        index < effectiveClassCount;
        index += 1
    ) {
        const valueIndex = Math.min(
            sortedValues.length - 1,
            Math.floor(
                index *
                sortedValues.length /
                effectiveClassCount,
            ),
        );
        const candidate = sortedValues[valueIndex];

        if (
            candidate >
            classStarts[classStarts.length - 1]
        ) {
            classStarts.push(candidate);
        }
    }

    return classStarts.map(
        (classMinimum, index) => {
            const classMaximum =
                index === classStarts.length - 1
                    ? maximum
                    : classStarts[index + 1];

            return {
                min: classMinimum,
                max: classMaximum,
                color: getClassColor(
                    colors,
                    index,
                    classStarts.length,
                ),
                label: createLabel(
                    classMinimum,
                    classMaximum,
                ),
            };
        },
    );
}

export function createGraduatedClasses(
    features: readonly LandUseFeature[],
    options: GraduatedClassOptions,
): GraduatedClass[] {
    const values = getNumericFieldValues(
        features,
        options.field,
    );
    const classes =
        options.method === "quantile"
            ? createQuantileClasses(
                values,
                options.classCount,
                options.colors,
            )
            : createEqualIntervalClasses(
                values,
                options.classCount,
                options.colors,
            );
    const maximumFractionDigits =
        options.field === "builtYear"
            ? 0
            : 0;

    return classes.map((item) => ({
        ...item,
        label: createLabel(
            item.min,
            item.max,
            maximumFractionDigits,
        ),
    }));
}
