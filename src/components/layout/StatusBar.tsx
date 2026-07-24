// 底部状态栏
interface StatusBarProps{
     statusText: string;
  sourceCrs?: string;
  displayCrs?: string;
}

export function StatusBar({
    statusText,
    sourceCrs="未加载",
    displayCrs="EPSG:3857",}:StatusBarProps){
    
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