// 地图工作台界面
// 组件名称首字母大写
// section             HTML 元素
// DataImportPage      React 组件

import { Link } from "react-router-dom";
import { useAppContext } from "../app/AppProvider";

// section 表示一个独立的页面功能区域
export function WorkspacePage() {
    const { state } = useAppContext();
    
    if (!state.dataset) {
        return (
            <section className="page-content">
                <h1>地图工作台</h1>
                <p>尚未加载空间数据</p>
                <Link to="/import">前往数据导入</Link>

            </section>
        );

    }
    
    const features = state.dataset?.collection.features;
    return (
        <section className="page-content">
            <h1>地图工作台</h1>
            <p>数据集：{state.dataset.name}</p>
            <p>要素数量：{features.length}</p>
            <p>
                源数据坐标系：
                {state.dataset.sourceCrs}
            </p>
            <p>地图显示坐标系：EPSG:3857</p>

            <div className="map-placeholder">
                MapLibre 将在后续阶段接入
            </div>
        </section>
    );
}