import { concat } from "@/util/classname-utils";
import { formatDate, minutesToTime, MONTHS_OF_YEAR_TRUNC, toLocalISOString } from "@/util/date-utils";
import { DayInfo } from "@/util/schedule-utils";
import { Commitment } from "@/services/CommitmentsProvider";
import { CSSProperties, memo, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { ObsidianContext } from "@/views/CalendarView";
import { MIN_ROW_HEIGHT, ROW_HEIGHT_EASE_TIME_MS } from "@/components/Calendar";
import { setTooltip } from "obsidian";
import CommitmentEl from "./CommitmentEl";
import { useDroppable } from "@dnd-kit/core";

export interface DayProps {
    dayInfo: DayInfo;
    thisMonth: boolean;
    optionDown: boolean;
}

function Day({ dayInfo, thisMonth, optionDown }: DayProps) {
    const { settings, calendarContext } = useContext(ObsidianContext)!;

    const getPeriod = (c: Commitment) => {
        let classPeriod = calendarContext.commitments.getClass(c)?.period;
        if (classPeriod) return classPeriod

        let project = calendarContext.commitments.getProject(c);
        if (!project) return;

        return calendarContext.commitments.getClass(project)?.period;
    }

    const tagRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!tagRef.current) return;
        if (!dayInfo.extraneous) return;

        setTooltip(tagRef.current, dayInfo.extraneous.title, {
            placement: "top",
            delay: 200,
        });
    }, [ dayInfo ]);

    const dayStyles = { minHeight: `${ MIN_ROW_HEIGHT }px` } as CSSProperties;
    const blockStyles = { transition: `height ${ ROW_HEIGHT_EASE_TIME_MS }ms ease` } as CSSProperties;

    const provider = calendarContext.commitments;

    const key = formatDate(dayInfo.date);

    const subscribe = useCallback(
        (listener: () => void) =>
            provider.subscribe(key, listener),
        [provider, key]
    );

    const getSnapshot = useCallback(
        () => provider.getCommitments(dayInfo.date),
        [provider, dayInfo.date]
    );

    const commitments = useSyncExternalStore(
        subscribe,
        getSnapshot
    );

    const csWithoutClass = commitments.filter(c => {
        const period = getPeriod(c);
        if (period == undefined) return true;

        const found = dayInfo.blocks.some(block => block.period == period);
        return !found;
    });

    const hoverShown = optionDown && dayInfo.blocks.length > 0;
    const belowShown = csWithoutClass.length > 0;
    const aboveShown =
        dayInfo.blocks.some(block =>
            commitments.some(c => getPeriod(c) == block.period)
        );

    const { setNodeRef, isOver } = useDroppable({
        id: formatDate(dayInfo.date),
        data: {
            date: dayInfo.date,
        },
    });

    const now = new Date();

    return (
        <div className={ concat("calendar-day", dayInfo.extraneous?.type, isOver && "drop-target") } data-date={ dayInfo.date.toDateString() }
             ref={setNodeRef}
             style={ dayStyles }>
            <div className="day-header">
                <div
                    className={ concat("day-number-container", thisMonth && "this-month", dayInfo.date.toDateString() == now.toDateString() && "today") }>
                    { dayInfo.date.getDate() == 1 && MONTHS_OF_YEAR_TRUNC[dayInfo.date.getMonth()] + " " }
                    <span className={ concat(
                        "day-number"
                    ) }>
                    { dayInfo.date.getDate() }
                </span>
                </div>
                <span className={ concat("day-type") } ref={ tagRef }>
                    { dayInfo.dayType }
                </span>
                <div className="day-options">
                    {/*    0/1*/ }
                </div>
            </div>
            <div className="day-container">
                {
                    dayInfo.blocks.map((block, bi) => (
                        ( () => {
                            const cs = commitments.filter(c => getPeriod(c) == block.period);

                            const nowMinutes = ( now.getHours() * 60 + now.getMinutes() );
                            const isNow = nowMinutes >= block.from && nowMinutes <= block.to;

                            return (
                                <div
                                    className={ concat("schedule-block", cs.length === 0 && "empty-block", isNow && "now") }
                                    key={ bi }
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
                        } )()
                    ))
                }
                <hr className={ concat(hoverShown && "hover-shown", aboveShown && "above-shown", belowShown && "bottom-shown") }/>
                {
                    csWithoutClass.map((comm, ci) => (
                        <CommitmentEl commitment={comm} draggable={true} key={ ci }></CommitmentEl>
                    ))
                }
                <div className={ concat("commitment", "new-commitment") } onClick={ () => {
                    calendarContext.commitments.createNewCommitment().then(async (f) => {
                        await calendarContext.commitments.modifyCommitmentFrontmatter(f, {
                            role: "event",
                            assigned: toLocalISOString(new Date()),
                            due: formatDate(dayInfo.date)
                        });
                        await calendarContext.obsidian.openInRightPane(f);
                    }).catch(console.error);
                } }>
                    +
                </div>
            </div>
        </div> );
}

export default memo(Day);
