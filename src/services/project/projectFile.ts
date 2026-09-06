import type {
    GeoInsightProject,
} from "../../types/project";
import {
    serializeProject,
} from "./projectSerializer";

function createSafeProjectFilename(name: string) {
    const normalized = name
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `${normalized || "geoinsight-project"}.geoinsight`;
}

export function exportProjectFile(project: GeoInsightProject) {
    const blob = new Blob(
        [serializeProject(project)],
        { type: "application/json;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = createSafeProjectFilename(project.project.name);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
