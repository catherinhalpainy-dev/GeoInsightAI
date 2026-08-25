import { RotateCcw, Trash2 } from "lucide-react";

interface MeasureToolbarProps {
    onRestart: () => void;
    onClear: () => void;
}

export function MeasureToolbar({
    onRestart,
    onClear,
}: MeasureToolbarProps) {
    return (
        <div className="measure-actions">
            <button
                type="button"
                className="measure-action-secondary"
                onClick={onRestart}
            >
                <RotateCcw size={15} aria-hidden="true" />
                重新测量
            </button>
            <button
                type="button"
                className="measure-action-danger"
                onClick={onClear}
            >
                <Trash2 size={15} aria-hidden="true" />
                清除
            </button>
        </div>
    );
}
