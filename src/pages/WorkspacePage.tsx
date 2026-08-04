// 地图工作台界面
// 组件名称首字母大写
// section             HTML 元素
// DataImportPage      React 组件

import { Link } from "react-router-dom";
import { useAppContext } from "../app/AppProvider";
import { MapView } from "../components/map/MapView";

// section 表示一个独立的页面功能区域
export function WorkspacePage() {
    const { state } = useAppContext();

    const isDatasetLoaded =
        state.dataset !== null &&
        state.importStatus === "loaded";

    if (!isDatasetLoaded) {
        return (
            <section className="page-content">
                <h1>地图工作台</h1>
                <p>尚未正式加载空间数据。</p>
                <Link to="/import">
                    前往数据导入
                </Link>
            </section>
        );
    }

    // const features = state.dataset?.collection.features;
    return (
        <section className="page-content">
            <header>
                <h1>地图工作台</h1>
                <p>
                    {state.dataset?.name}
                    {"."}
                    {state.dataset?.collection.features.length}
                    条要素
                </p>
            </header>
            <div className="workspace-map">
                <MapView 
                collection={state.dataset?.collection}
                />
            </div>
        </section>
    );
}