import { memo, useEffect, useRef } from "react";
import { setTooltip } from "obsidian";
import { offsetHitAngle, Point, rayCircleHitAngle } from "@/util/task-svg-utils";

const check_bottom: Point = { x: 50, y: 63 };
const circle_center: Point = { x: 50, y: 50 };
const check_small_offset = 14;
const check_big_offset = 38;
const radius = 42;
const offset_angle = 40;

const angle = Math.atan(-1); // check_big_offset / -check_big_offset, but bc vars are the same its just -1

const theta = rayCircleHitAngle(
    { x: check_bottom.x - circle_center.x, y: check_bottom.y - circle_center.y },
    angle, // radians
    radius
);

const start_point = offsetHitAngle(
    theta ?? 0,
    offset_angle * Math.PI/180, // radians
    radius,
    circle_center,
);

const end_point = offsetHitAngle(
    theta ?? 0,
    -offset_angle * Math.PI/180, // radians
    radius,
    circle_center,
);

function TaskButton({ complete, total, onClick }: { complete: number, total: number, onClick?: () => void }) {
    const tagRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!tagRef.current) return;

        setTooltip(tagRef.current, `${ complete } / ${ total }`, {
            placement: "top",
            delay: 200,
        });
    }, [ complete, total ]);

    return (
        <div className="task-button circular-button" ref={ tagRef } onClick={ onClick }>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={ "task-button-icon" }>
                <path
                    id="track"
                    d={ `M${ start_point.x } ${ start_point.y } A${ radius } ${ radius } 0 1 1 ${ end_point.x } ${ end_point.y }` }
                    fill="none"
                    stroke="var(--track-color)"
                    strokeWidth="16"
                    strokeLinecap="round"
                />
                {total > 0 && complete > 0 && (
                    <path
                        id="progress"
                        d={ `M${ start_point.x } ${ start_point.y } A${ radius } ${ radius } 0 1 1 ${ end_point.x } ${ end_point.y }` }
                        fill="none"
                        stroke="var(--progress-color)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray="101"
                        strokeDashoffset={ 100 - ( complete / total ) * 100 }
                    />
                )}
                <path
                    d={ `M${ check_bottom.x - check_small_offset } ${ check_bottom.y - check_small_offset } L${ check_bottom.x } ${ check_bottom.y } L${ check_bottom.x + check_big_offset } ${ check_bottom.y - check_big_offset }` }
                    fill="none"
                    stroke="var(--text-normal)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}

export default memo(TaskButton);
