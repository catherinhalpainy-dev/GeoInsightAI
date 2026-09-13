import type { GeoInsightProject } from "../../types/project";
import { deserializeProject } from "../project/projectSerializer";

const DEMO_PROJECT_URL = "/demo-data/parcel-review/demo.geoinsight";

export async function loadDemoProject(signal?: AbortSignal) {
    const response = await fetch(DEMO_PROJECT_URL, {
        method: "GET",
        signal,
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`示例工程请求失败（HTTP ${response.status}）。`);
    }

    return deserializeProject(await response.text());
}

export function createDemoProjectInstance(
    template: GeoInsightProject,
): GeoInsightProject {
    const now = Date.now();
    const instance = structuredClone(template);

    return {
        ...instance,
        project: {
            ...instance.project,
            id: crypto.randomUUID(),
            name: "滨江地块开发条件分析",
            createdAt: now,
            updatedAt: now,
        },
    };
}
