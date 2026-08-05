import { CSSProperties, memo, useContext, useEffect, useRef, useState } from "react";
import { concat } from "@/util/classname-utils";
import { formatDate, minutesToTime, toLocalISOString } from "@/util/date-utils";
import CommitmentEl from "@/components/CommitmentEl";
import { ObsidianContext } from "@/views/CalendarView";
import { Commitment } from "@/services/CommitmentsProvider";
import { Block, DayInfo, ParsedBlock } from "@/util/schedule-utils";
import { ROW_HEIGHT_EASE_TIME_MS } from "@/components/Calendar";
import { useDroppable } from "@dnd-kit/core";

function ScheduleBlock({ commitments, block, dayInfo }: { commitments: readonly Commitment[], block: ParsedBlock, dayInfo: DayInfo }) {
    const { settings, calendarContext } = useContext(ObsidianContext)!;

    const getPeriod = (c: Commitment) => {
        let classPeriod = calendarContext.commitments.getClass(c)?.period;
        if (classPeriod) return classPeriod

        let project = calendarContext.commitments.getProject(c);
        if (!project) return;

        return calendarContext.commitments.getClass(project)?.period;
    }

    const cs = commitments.filter(c => getPeriod(c) == block.period);

    const getNowMinutes = () => {
        const now = new Date();
        const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();

        return nowMinutes;
    }

    const computeIsNow = (nowMinutes: number) => {
        return nowMinutes >= block.from && nowMinutes <= block.to;
    }

    const nowMinutes = useRef(getNowMinutes());
    const [isNow, setIsNow] = useState(false);
    const [, setTick] = useState(0);

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
            const current = getNowMinutes();
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
                (nextBoundary - current) * 60_000 -
                now.getSeconds() * 1000 -
                now.getMilliseconds();

            return setTimeout(scheduleNext, ms);
        }

        const id = scheduleNext();
        return () => id && clearTimeout(id);
    }, [block.from, block.to, dayInfo.date]);

    const blockStyles = { transition: `height ${ ROW_HEIGHT_EASE_TIME_MS }ms ease` } as CSSProperties;

    const {setNodeRef, isOver} = useDroppable({
        id: `${formatDate(dayInfo.date)}-${block.period}`,
        data: {
            type: "period",
            date: dayInfo.date,
            period: block.period,
        },
    });

    return (
        <div
            ref={setNodeRef}
            className={ concat("schedule-block", cs.length === 0 && "empty-block", isNow && "now", isOver && "drop-target") }
            style={ blockStyles }
            onClick={ () => {
                let c = calendarContext.classes.getClassByPeriod(block.period);
                if (c) {
                    calendarContext.obsidian.openInRightPane(c.file).catch(console.error);
                }
            } }
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
                    <CommitmentEl commitment={comm} draggable={true} key={ ci }></CommitmentEl>
                ))
            }
            { cs.length > 0 && (
                <div className={ concat("commitment", "new-commitment") } onClick={ () => {
                    calendarContext.commitments.createNewCommitment()
                        .then(async (f) => {
                            const c = calendarContext.classes.getClassByPeriod(block.period);
                            await calendarContext.commitments.modifyCommitmentFrontmatter(f, {
                                role: "event",
                                assigned: toLocalISOString(new Date()),
                                due: formatDate(dayInfo.date),
                                class: c ? `[[${ c.file.path }]]` : ""
                            });
                            await calendarContext.obsidian.openInRightPane(f);
                        })
                        .catch(console.error);
                } }>
                    +
                </div>
            ) }
        </div>
    )
}

export default memo(ScheduleBlock);
