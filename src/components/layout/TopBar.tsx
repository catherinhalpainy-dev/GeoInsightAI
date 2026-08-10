// 公共顶部导航
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAppContext } from "../../app/AppProvider";


const navigationItems = [
    { path: "/import", label: "数据导入" },
    { path: "/workspace", label: "地图工作台" },
    { path: "/statistics", label: "统计分析" },
    { path: "/report", label: "分析报告" },

]

export function TopBar() {
    const { state } = useAppContext();

    const datasetName = state.dataset?.name ?? "尚未加载数据";

    const navigate = useNavigate();
    const location = useLocation();
    const searchParams =
        new URLSearchParams(location.search);
    const agentOpen =
        location.pathname ===
        "/workspace" &&
        searchParams.get("panel") ===
        "agent";

    return (
        <header className="topbar">
            <div className="brand">
                <span className="brand-mark">◎</span>
                <span>GeoInsight AI</span>
            </div>
            {/* aria-label 可以帮助用户区分 */}
            <nav className="main-nav" aria-label="主导航">
                {/* map:依次处理原数组中的每一个元素，并把每次返回的结果组成一个新数组 */}
                {/* 箭头函数使用圆括号时，可以直接返回 JSX，不需要写 return */}
                {navigationItems.map(
                    (item) => (
                        <NavLink
                            // key唯一标识路径,path不可以重复
                            key={item.path}
                            // to 表示点击该链接后要跳转到哪个地址
                            to={item.path}
                            className={({ isActive }) =>
                                isActive ? "nav-link active" : "nav-link"}
                        >
                            {item.label}

                        </NavLink>
                    ))}
            </nav>
            <div className="topbar-actions">
                <span className="dataset-chip">{datasetName}</span>

                <button type="button"
                    className={
                        agentOpen
                            ? "agent-button active"
                            : "agent-button"
                    }
                    aria-pressed={
                        agentOpen
                    }
                    onClick={() => {
                        if (agentOpen) {
                            navigate("/workspace",);
                            return;
                        }
                        navigate("/workspace?panel=agent",);
                    }}
                >
                     ✦ Agent 分析
                </button>
            </div>
        </header>
    );
}