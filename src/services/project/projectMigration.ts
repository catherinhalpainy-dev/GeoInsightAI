import {
    GEOINSIGHT_PROJECT_VERSION,
} from "../../types/project";

export class ProjectVersionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProjectVersionError";
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migrateProject(raw: unknown): unknown {
    if (!isRecord(raw) || raw.format !== "geoinsight-project") {
        throw new ProjectVersionError("无法识别该 GeoInsight 工程文件。");
    }

    if (typeof raw.version !== "number" || !Number.isInteger(raw.version)) {
        throw new ProjectVersionError("无法识别该 GeoInsight 工程文件。");
    }

    if (raw.version > GEOINSIGHT_PROJECT_VERSION) {
        throw new ProjectVersionError(
            "该工程由更新版本的 GeoInsight AI 创建，当前版本暂不支持。",
        );
    }

    switch (raw.version) {
        case 1:
            return raw;
        default:
            throw new ProjectVersionError("无法识别该 GeoInsight 工程文件。");
    }
}
