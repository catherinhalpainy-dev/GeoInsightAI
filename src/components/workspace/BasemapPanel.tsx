import type {
    BasemapType,
} from "../../types/workspace";


interface BasemapPanelProps {
    value:
        BasemapType;

    onChange: (
        value:
            BasemapType,
    ) => void;

    onClose:
        () => void;
}


export function BasemapPanel({
    value,
    onChange,
    onClose,
}: BasemapPanelProps) {
    return (
        <aside className="basemap-panel">
            <header className="basemap-panel-header">
                <div>
                    <span>
                        BASEMAP
                    </span>

                    <h2>
                        底图切换
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={
                        onClose
                    }
                >
                    ×
                </button>
            </header>


            <div className="basemap-options">
                <button
                    type="button"
                    className={
                        value ===
                        "dark"
                            ? "is-active"
                            : ""
                    }
                    onClick={() =>
                        onChange(
                            "dark",
                        )
                    }
                >
                    深色底图
                </button>


                <button
                    type="button"
                    className={
                        value ===
                        "light"
                            ? "is-active"
                            : ""
                    }
                    onClick={() =>
                        onChange(
                            "light",
                        )
                    }
                >
                    浅色底图
                </button>


                <button
                    type="button"
                    className={
                        value ===
                        "blank"
                            ? "is-active"
                            : ""
                    }
                    onClick={() =>
                        onChange(
                            "blank",
                        )
                    }
                >
                    无底图
                </button>
            </div>
        </aside>
    );
}