import { useEffect, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Pause,
    Play,
} from "lucide-react";

import type { TemporalConfig } from "../../types/temporal";
import { formatTemporalValue } from "../../services/temporal/formatTemporalValue";

interface TimelineControlProps {
    config: TemporalConfig;
    values: readonly number[];
    onCurrentChange: (value: number) => void;
}

export function TimelineControl({
    config,
    values,
    onCurrentChange,
}: TimelineControlProps) {
    const [playing, setPlaying] = useState(false);
    const { current, enabled, type } = config;
    const currentIndex = Math.max(0, values.indexOf(current));

    useEffect(() => {
        if (!playing || values.length < 2) {
            return;
        }

        const timer = window.setInterval(() => {
            const index = values.indexOf(current);
            if (index < 0 || index >= values.length - 1) {
                setPlaying(false);
                return;
            }

            onCurrentChange(values[index + 1]);
        }, 900);

        return () => window.clearInterval(timer);
    }, [current, onCurrentChange, playing, values]);

    useEffect(() => {
        if (!enabled) {
            setPlaying(false);
        }
    }, [enabled]);

    if (!enabled || values.length === 0) {
        return null;
    }

    const atStart = currentIndex <= 0;
    const atEnd = currentIndex >= values.length - 1;

    return (
        <section className="timeline-control" aria-label="时间轴控制器">
            <div className="timeline-actions">
                <button
                    type="button"
                    disabled={atStart}
                    aria-label="上一时间"
                    onClick={() => onCurrentChange(values[currentIndex - 1])}
                >
                    <ChevronLeft size={15} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    aria-label={playing ? "暂停时间播放" : "播放时间轴"}
                    disabled={values.length < 2 || (atEnd && !playing)}
                    onClick={() => setPlaying((value) => !value)}
                >
                    {playing
                        ? <Pause size={15} aria-hidden="true" />
                        : <Play size={15} aria-hidden="true" />}
                </button>
                <button
                    type="button"
                    disabled={atEnd}
                    aria-label="下一时间"
                    onClick={() => onCurrentChange(values[currentIndex + 1])}
                >
                    <ChevronRight size={15} aria-hidden="true" />
                </button>
            </div>
            <div className="timeline-track">
                <div className="timeline-labels">
                    <span>{formatTemporalValue(values[0], type)}</span>
                    <strong>{formatTemporalValue(current, type)}</strong>
                    <span>{formatTemporalValue(values[values.length - 1], type)}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max={Math.max(0, values.length - 1)}
                    step="1"
                    value={currentIndex}
                    aria-label="当前时间"
                    onChange={(event) => {
                        setPlaying(false);
                        onCurrentChange(values[Number(event.currentTarget.value)]);
                    }}
                />
            </div>
        </section>
    );
}
