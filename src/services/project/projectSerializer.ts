import type {
    GeoInsightProject,
    ProjectSnapshotInput,
} from "../../types/project";
import {
    GEOINSIGHT_PROJECT_FORMAT,
    GEOINSIGHT_PROJECT_VERSION,
} from "../../types/project";
import {
    migrateProject,
    ProjectVersionError,
} from "./projectMigration";
import {
    geoInsightProjectSchema,
} from "./projectSchema";

export class ProjectValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProjectValidationError";
    }
}

export function createProjectSnapshot(
    input: ProjectSnapshotInput,
): GeoInsightProject {
    const updatedAt = Date.now();

    return {
        format: GEOINSIGHT_PROJECT_FORMAT,
        version: GEOINSIGHT_PROJECT_VERSION,
        project: {
            ...input.project,
            updatedAt,
        },
        data: input.data,
        map: input.map,
        workspace: input.workspace,
    };
}

export function serializeProject(project: GeoInsightProject) {
    return JSON.stringify(project, null, 2);
}

export function deserializeProject(input: unknown): GeoInsightProject {
    let parsed: unknown = input;

    if (typeof input === "string") {
        try {
            parsed = JSON.parse(input) as unknown;
        } catch {
            throw new ProjectValidationError("工程文件不是有效的 JSON。");
        }
    }

    let migrated: unknown;

    try {
        migrated = migrateProject(parsed);
    } catch (error) {
        if (error instanceof ProjectVersionError) {
            throw new ProjectValidationError(error.message);
        }

        throw error;
    }

    const result = geoInsightProjectSchema.safeParse(migrated);

    if (!result.success) {
        throw new ProjectValidationError(
            "无法识别该 GeoInsight 工程文件，工程结构或数据字段无效。",
        );
    }

    return result.data;
}
