import { LAND_USE_TYPES } from "../constants/landUse";
import type {
  LandUseDataset,
  LandUseFeature,
  LandUseProperties,
  LandUseType,
  Position,
} from "../types/landUse";

export type GeoJsonImportResult =
  | {
    ok: true;
    dataset: LandUseDataset;
    warnings: string[];
  }
  | {
    ok: false;
    errors: string[];
  };

interface FeatureParseSuccess {
  ok: true;
  feature: LandUseFeature;
}

interface FeatureParseFailure {
  ok: false;
  error: string;
}

type FeatureParseResult =
  | FeatureParseSuccess
  | FeatureParseFailure;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    // typeof null === "object"  但null不是对象
    typeof value === "object" &&
    value !== null &&
    // 数组的typeof也是object，但不是普通对象
    !Array.isArray(value)
  );
}

function isLandUseType(
  value: unknown,
): value is LandUseType {
  return (
    typeof value === "string" &&
    LAND_USE_TYPES.some((type) => {
      return type === value;
    })
  );
}

function isPosition(
  value: unknown,
): value is Position {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length !== 2) {
    return false;
  }

  const [longitude, latitude] = value;

  return (
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function isLinearRing(
  value: unknown,
): value is Position[] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length < 4) {
    return false;
  }

  if (!value.every(isPosition)) {
    return false;
  }

  const firstPosition = value[0];
  const lastPosition = value[value.length - 1];

  return (
    firstPosition[0] === lastPosition[0] &&
    firstPosition[1] === lastPosition[1]
  );
}

function isPolygonCoordinates(
  value: unknown,
): value is Position[][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isLinearRing)
  );
}

function parseFeature(
  value: unknown,
  index: number,
): FeatureParseResult {
  const prefix = `第 ${index + 1} 条要素`;

  if (!isRecord(value)) {
    return {
      ok: false,
      error: `${prefix}不是有效对象`,
    };
  }

  if (value.type !== "Feature") {
    return {
      ok: false,
      error: `${prefix}的 type 必须是 Feature`,
    };
  }

  const geometry = value.geometry;

  if (!isRecord(geometry)) {
    return {
      ok: false,
      error: `${prefix}缺少有效 geometry`,
    };
  }

  if (geometry.type !== "Polygon") {
    return {
      ok: false,
      error: `${prefix}目前只支持 Polygon 几何`,
    };
  }

  if (!isPolygonCoordinates(geometry.coordinates)) {
    return {
      ok: false,
      error: `${prefix}的 Polygon coordinates 无效`,
    };
  }

  const properties = value.properties;

  if (!isRecord(properties)) {
    return {
      ok: false,
      error: `${prefix}缺少有效 properties`,
    };
  }

  const id = properties.id;

  if (
    typeof id !== "string" ||
    id.trim() === ""
  ) {
    return {
      ok: false,
      error: `${prefix}的 id 必须是非空字符串`,
    };
  }

  const landUseType = properties.landUseType;

  if (!isLandUseType(landUseType)) {
    return {
      ok: false,
      error: `${prefix}的 landUseType 不受支持`,
    };
  }

  const areaM2 = properties.areaM2;

  if (
    typeof areaM2 !== "number" ||
    !Number.isFinite(areaM2) ||
    areaM2 <= 0
  ) {
    return {
      ok: false,
      error: `${prefix}的 areaM2 必须是正数`,
    };
  }

  const districtCode = properties.districtCode;

  if (
    typeof districtCode !== "string" ||
    districtCode.trim() === ""
  ) {
    return {
      ok: false,
      error: `${prefix}的 districtCode 必须是非空字符串`,
    };
  }

  const builtYear = properties.builtYear;

  const isBuiltYearValid =
    builtYear === null ||
    (
      typeof builtYear === "number" &&
      Number.isInteger(builtYear)
    );

  if (!isBuiltYearValid) {
    return {
      ok: false,
      error:
        `${prefix}的 builtYear 必须是整数或 null`,
    };
  }

  const parsedProperties: LandUseProperties = {
    id,
    landUseType,
    areaM2,
    districtCode,
    builtYear,
  };

  return {
    ok: true,
    feature: {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: geometry.coordinates,
      },
      properties: parsedProperties,
    },
  };
}

function createDatasetName(
  fileName: string,
): string {
  // replace:查找并替换字符串
  // 原来的字符串不会被修改
  // 返回一个新的字符串
  // replace(要找的，替换成的)
  return fileName.replace(
    /\.(geojson|json)$/i,
    "",
  );
  // 找不到匹配内容，直接返回原字符串
}

function createDatasetId(
  fileName: string,
): string {
  const normalizedName = createDatasetName(fileName)
    .toLowerCase()
    // []:匹配括号内的任意一个字符
    // ^:取反，匹配不在括号内的任意一个字符
    // +:匹配前一个字符一次或多次
    // g:全局匹配，匹配所有符合条件的内容
    .replace(/[^a-z0-9]+/g, "-")
    // ^:匹配开头
    // $:匹配结尾
    .replace(/^-|-$/g, "");

  return normalizedName
    ? `uploaded-${normalizedName}`
    : "uploaded-land-use";
}

export function parseLandUseGeoJson(
  value: unknown,
  fileName: string,
): GeoJsonImportResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      errors: ["文件根节点必须是一个对象"],
    };
  }

  if (value.type !== "FeatureCollection") {
    return {
      ok: false,
      errors: [
        "GeoJSON 根节点 type 必须是 FeatureCollection",
      ],
    };
  }

  if (!Array.isArray(value.features)) {
    return {
      ok: false,
      errors: ["FeatureCollection 缺少 features 数组"],
    };
  }

  if (value.features.length === 0) {
    return {
      ok: false,
      errors: ["GeoJSON 中没有任何要素"],
    };
  }

  const validFeatures: LandUseFeature[] = [];
  const warnings: string[] = [];
  const usedIds = new Set<string>();

  value.features.forEach((feature, index) => {
    const result = parseFeature(feature, index);

    if (!result.ok) {
      warnings.push(result.error);
      return;
    }

    const featureId =
      result.feature.properties.id;

    if (usedIds.has(featureId)) {
      warnings.push(
        `第 ${index + 1} 条要素的 id ${featureId} 重复，已跳过`,
      );

      return;
    }

    usedIds.add(featureId);
    validFeatures.push(result.feature);
  });

  if (validFeatures.length === 0) {
    return {
      ok: false,
      errors: [
        "文件中没有符合城市用地模型的有效要素",
        ...warnings,
      ],
    };
  }

  return {
    ok: true,
    dataset: {
      id: createDatasetId(fileName),
      name: createDatasetName(fileName),
      sourceCrs: "EPSG:4326",
      collection: {
        type: "FeatureCollection",
        features: validFeatures,
      },
    },
    warnings,
  };
}