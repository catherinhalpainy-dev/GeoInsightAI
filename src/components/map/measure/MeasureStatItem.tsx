import type { ReactNode } from "react";

interface MeasureStatItemProps {
    icon?: ReactNode;
    label: string;
    value: ReactNode;
    wide?: boolean;
}

export function MeasureStatItem({
    icon,
    label,
    value,
    wide = false,
}: MeasureStatItemProps) {
    return (
        <div className={wide ? "measure-stat-item is-wide" : "measure-stat-item"}>
            <div className="measure-stat-label">
                {icon}
                <span>{label}</span>
            </div>
            <strong className="measure-stat-value">{value}</strong>
        </div>
    );
}
