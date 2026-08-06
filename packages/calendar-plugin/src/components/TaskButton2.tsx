import { memo, useEffect, useRef } from "react";
import { setTooltip } from "obsidian";
import { Point } from "@/util/task-svg-utils";

const check_small_offset = 14;
const check_big_offset = 38;
const check_bottom: Point = { x: 50-check_small_offset*2/3, y: 50+(38/2) };

function TaskButton2({ complete, total, onClick }: { complete: number, total: number, onClick?: () => void }) {
    const tagRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!tagRef.current) return;

        setTooltip(tagRef.current, `${ complete } / ${ total }`, {
            placement: "top",
            delay: 200,
        });
    }, [ complete, total ]);

    return (
        <div className="task-button filled-button" ref={ tagRef } onClick={ onClick }>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={ "task-button-icon" }>
                <path
                    d={ `M${ check_bottom.x - check_small_offset } ${ check_bottom.y - check_small_offset } L${ check_bottom.x } ${ check_bottom.y } L${ check_bottom.x + check_big_offset } ${ check_bottom.y - check_big_offset }` }
                    fill="none"
                    stroke="var(--text-normal)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div className="task-button-fill" style={{height: `${complete/total * 100}%`}}></div>
        </div>
    );
}

export default memo(TaskButton2);
