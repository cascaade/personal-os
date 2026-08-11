import { CSSProperties, memo, useContext, useEffect, useRef, useState } from "react";
import { concat } from "@personal-os/core/dist/utils/classname-utils";
import { dateToMinutes, formatDate, minutesToTime, toLocalISOString } from "@personal-os/core/dist/utils/date-utils";
import CommitmentEl from "@/components/CommitmentEl";
import { ObsidianContext } from "@/views/CalendarView";
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { DayInfo, ParsedBlock } from "@personal-os/core/dist/utils/schedule-utils";
import { ROW_HEIGHT_EASE_TIME_MS } from "@/components/Calendar";
import { useDroppable } from "@dnd-kit/core";

function ScheduleBlock({ commitments, block, dayInfo, optionDown }: {
    commitments: readonly Commitment[],
    block: ParsedBlock,
    dayInfo: DayInfo,
    optionDown: boolean,
}) {
    const { settings, ctx, leaf } = useContext(ObsidianContext)!;

    const cs = commitments.filter(c => c.role != "task" && c.role != "project").filter(c => ctx.commitments.getPeriod(c) == block.period);

    const computeIsNow = (nowMinutes: number) => {
        return nowMinutes >= block.from && nowMinutes <= block.to;
    }

    const nowMinutes = useRef(dateToMinutes(new Date()));
    const [ isNow, setIsNow ] = useState(false);
    const [ , setTick ] = useState(0);

    function isSameDay(a: Date, b: Date) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    function startOfNextDay(date: Date) {
        const next = new Date(date);
        next.setHours(24, 0, 0, 0); // rolls to next midnight
        return next;
    }

    useEffect(() => {
        const today = new Date();
        const blockDate = dayInfo.date;

        // Case 1: block's day already passed — nothing to schedule
        if (blockDate < today && !isSameDay(blockDate, today)) {
            setIsNow(false);
            return;
        }

        // Case 2: block's day hasn't arrived yet — wait for midnight rollover
        if (!isSameDay(blockDate, today)) {
            setIsNow(false);
            const ms = startOfNextDay(today).getTime() - today.getTime();
            const id = setTimeout(() => {
                setTimeout(() => setTick(t => t + 1), ms);
            }, ms);
            return () => clearTimeout(id);
        }

        // Case 3: it's today — existing minute-based logic
        function scheduleNext() {
            const current = dateToMinutes(new Date());
            nowMinutes.current = current;
            setIsNow(computeIsNow(current));

            let nextBoundary;
            if (current < block.from) {
                nextBoundary = block.from;
            } else if (current <= block.to) {
                nextBoundary = block.to + 1;
            } else {
                nextBoundary = null; // today's block is over, nothing left to schedule
            }

            if (nextBoundary === null) return null;

            const now = new Date();
            const ms =
                ( nextBoundary - current ) * 60_000 -
                now.getSeconds() * 1000 -
                now.getMilliseconds();

            return setTimeout(scheduleNext, ms);
        }

        const id = scheduleNext();
        return () => id && clearTimeout(id);
    }, [ block.from, block.to, dayInfo.date ]);

    const blockStyles = { transition: `height ${ ROW_HEIGHT_EASE_TIME_MS }ms ease` } as CSSProperties;

    const { setNodeRef, isOver } = useDroppable({
        id: `${ formatDate(dayInfo.date) }-${ block.period }`,
        data: {
            type: "period",
            date: dayInfo.date,
            period: block.period,
        },
    });

    const createNewCommitment = () => {
        ctx.commitments.createNewCommitment()
            .then(async (f) => {
                const c = ctx.classes.getClassByPeriod(block.period);
                await ctx.commitments.modifyCommitmentFrontmatter(f, {
                    role: "event",
                    assigned: toLocalISOString(new Date()),
                    due: formatDate(dayInfo.date),
                    class: c ? `[[${ c.file.path }]]` : ""
                });
                await ctx.obsidian.openInRightPane(f, leaf);
            })
            .catch(console.error);
    }

    const onClick = () => {
        let c = ctx.classes.getClassByPeriod(block.period);

        if (c) {
            if (cs.length === 0)
                return createNewCommitment();

            ctx.obsidian.openInRightPane(c.file, leaf).catch(console.error);
        }
    }

    const onContextMenu = (e: MouseEvent, newCommitment: boolean) => {
        if (e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();

            if (newCommitment) {
                createNewCommitment();
            } else {
                onClick();
            }
        }
    }

    return (
        <div
            ref={ setNodeRef }
            className={ concat("schedule-block", cs.length === 0 && "empty-block", isNow && "now", isOver && "drop-target") }
            style={ blockStyles }
            onClick={ onClick }
            onContextMenu={ e => onContextMenu(e as unknown as MouseEvent, cs.length === 0) }
        >
            <div className="block-header">
                <span className="block-period">{ block.period }</span>
                <span className={ "block-time" }>{
                    minutesToTime(
                        block.from,
                        settings.twentyFourHourDisplayTime,
                        settings.showAmPmDisplayTime
                    ) + " - " + minutesToTime(
                        block.to,
                        settings.twentyFourHourDisplayTime,
                        settings.showAmPmDisplayTime
                    )
                }</span>
            </div>
            {
                cs.map((comm, ci) => (
                    <CommitmentEl commitment={ comm } draggable={ true } key={ ci } duplicateOnDrag={optionDown}></CommitmentEl>
                ))
            }
            { cs.length > 0 && (
                <div
                    className={ concat("commitment", "new-commitment") }
                    onClick={ createNewCommitment }
                    onContextMenu={ e => onContextMenu(e as unknown as MouseEvent, true) }
                >
                    +
                </div>
            ) }
        </div>
    )
}

export default memo(ScheduleBlock);
