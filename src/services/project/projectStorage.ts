import type {
    GeoInsightProject,
    RecentProjectMetadata,
} from "../../types/project";
import {
    deserializeProject,
} from "./projectSerializer";

const DATABASE_NAME = "geoinsight-db";
const DATABASE_VERSION = 1;
const PROJECT_STORE = "projects";
const PROJECT_METADATA_STORE = "project-metadata";

function requestToPromise<Result>(request: IDBRequest<Result>) {
    return new Promise<Result>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(
            request.error ?? new Error("IndexedDB 操作失败。"),
        );
    });
}

function transactionToPromise(transaction: IDBTransaction) {
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(
            transaction.error ?? new Error("IndexedDB 事务已取消。"),
        );
        transaction.onerror = () => reject(
            transaction.error ?? new Error("IndexedDB 事务失败。"),
        );
    });
}

function openDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(
            DATABASE_NAME,
            DATABASE_VERSION,
        );

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(PROJECT_STORE)) {
                database.createObjectStore(PROJECT_STORE, {
                    keyPath: "project.id",
                });
            }

            if (!database.objectStoreNames.contains(PROJECT_METADATA_STORE)) {
                const metadataStore = database.createObjectStore(
                    PROJECT_METADATA_STORE,
                    { keyPath: "id" },
                );
                metadataStore.createIndex("updatedAt", "updatedAt");
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(
            request.error ?? new Error("无法打开本地工程数据库。"),
        );
        request.onblocked = () => reject(
            new Error("本地工程数据库正在被其他页面占用。"),
        );
    });
}

function createRecentMetadata(
    project: GeoInsightProject,
): RecentProjectMetadata {
    return {
        ...project.project,
        primaryFeatureCount:
            project.data.primaryDataset.collection.features.length,
        overlayLayerCount: project.data.overlayLayers.length,
        analysisLayerCount: project.data.analysisResultLayers.length,
    };
}

export async function saveProject(project: GeoInsightProject) {
    const database = await openDatabase();

    try {
        const transaction = database.transaction(
            [PROJECT_STORE, PROJECT_METADATA_STORE],
            "readwrite",
        );
        transaction.objectStore(PROJECT_STORE).put(project);
        transaction.objectStore(PROJECT_METADATA_STORE).put(
            createRecentMetadata(project),
        );
        await transactionToPromise(transaction);
    } finally {
        database.close();
    }
}

export async function loadProject(projectId: string) {
    const database = await openDatabase();

    try {
        const transaction = database.transaction(PROJECT_STORE, "readonly");
        const stored = await requestToPromise<unknown>(
            transaction.objectStore(PROJECT_STORE).get(projectId),
        );

        return stored === undefined
            ? null
            : deserializeProject(stored);
    } finally {
        database.close();
    }
}

export async function deleteProject(projectId: string) {
    const database = await openDatabase();

    try {
        const transaction = database.transaction(
            [PROJECT_STORE, PROJECT_METADATA_STORE],
            "readwrite",
        );
        transaction.objectStore(PROJECT_STORE).delete(projectId);
        transaction.objectStore(PROJECT_METADATA_STORE).delete(projectId);
        await transactionToPromise(transaction);
    } finally {
        database.close();
    }
}

export async function listProjects() {
    const database = await openDatabase();

    try {
        const transaction = database.transaction(
            PROJECT_METADATA_STORE,
            "readonly",
        );
        const projects = await requestToPromise<RecentProjectMetadata[]>(
            transaction.objectStore(PROJECT_METADATA_STORE).getAll(),
        );

        return projects.sort(
            (first, second) => second.updatedAt - first.updatedAt,
        );
    } finally {
        database.close();
    }
}
