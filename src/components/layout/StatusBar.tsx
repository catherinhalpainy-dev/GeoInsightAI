import { useAppContext } from "../../app/AppProvider";

// 底部状态栏


export function StatusBar(){
    const {state}=useAppContext();

    const sourceCrs=
        state.dataset?.sourceCrs??"未加载";
    
    const statusText={
        idle:"等待导入数据",
        preview:"数据预览中",
        loaded:"数据已加载",
    }[state.importStatus];

    const displayCrs="EPSG:3857";
    return(
        <footer className="statusbar">
            <span>
                <i className="status-dot"/>
                {statusText}
            </span>
            <span>源数据坐标系:{sourceCrs}</span>
            <span>地图显示坐标系:{displayCrs}</span>
        </footer>
    );
}