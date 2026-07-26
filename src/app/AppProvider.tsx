import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { AppAction, AppState } from "./appTypes";
import { appReducer, initialAppState } from "./appReducer";

// interface 和对象类型声明中：写分号
// 真正对象值中：写逗号
interface AppContextValue {
    state: AppState;
    // 用于接收 AppAction 的派发函数
    dispatch: Dispatch<AppAction>;
}


// context:让数据跨越多层组件传递，避免逐层传递props
// AppProvider
// └── App
//     └── WorkspacePage
//         └── MapPanel
//             └── LayerButton
// useContext：在子组件中读取Context提供的数据
// useReducer：管理较复杂的状态

// createContext(默认值)
// 尖括号中规定 Context 保存的数据类型
const AppContext =
    createContext<AppContextValue | null>(null);

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({children}:AppProviderProps){
    // useReducer(reducer函数, 初始状态)
    const [state,dispatch]=useReducer(
        appReducer,
        initialAppState,
    );
    return(
        <AppContext.Provider
        value={{state,dispatch}}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext(){
    const context =useContext(AppContext);

    if(!context){
        throw new Error(
            "useAppContext must be used inside AppProvider",
        );
    }
    return context;
}