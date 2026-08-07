import { useAppContext } from "../../app/AppProvider";
import type { ImportStatus } from "../../app/appTypes";

// 底部状态栏
const STATUS_TEXTS: Record<
    ImportStatus,
    string
> = {
    idle: "等待导入数据",
    reading: "正在读取文件",
    validating: "正在校验数据",
    preview: "数据预览中",
    loaded: "数据已加载",
    error: "数据导入失败",
};

export function StatusBar() {
    const { state,filteredFeatures, } = useAppContext();

    const sourceCrs =
        state.dataset?.sourceCrs ?? "未加载";

    const totalFeatureCount=
        state.dataset?.collection.features.length??0;

    const statusText = STATUS_TEXTS[state.importStatus];
    const statusClassName =
        state.importStatus === "error"
            ? "status-dot status-dot-error"
            : state.importStatus === "reading" ||
                state.importStatus === "validating"
                ? "status-dot status-dot-working"
                : "status-dot status-dot-success";
    const displayCrs = "EPSG:3857";
    return (
        <footer className="statusbar">
            <span>
                <i className={statusClassName} />
                {statusText}
            </span>
            <span>源数据坐标系:{sourceCrs}</span>
            <span>地图显示坐标系:{displayCrs}</span>
            {state.dataset&&(
                <span>
                    当前要素：
                    {filteredFeatures.length}
                    {"/"}
                    {totalFeatureCount}
                </span>
            )
            }
        </footer>
    );
}