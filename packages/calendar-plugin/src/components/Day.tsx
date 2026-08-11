import { concat } from "@personal-os/core/dist/utils/classname-utils";
import { formatDate, MONTHS_OF_YEAR_TRUNC, toLocalISOString } from "@personal-os/core/dist/utils/date-utils";
import { DayInfo } from "@personal-os/core/dist/utils/schedule-utils";
import React, { CSSProperties, memo, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { ObsidianContext } from "@/views/CalendarView";
import { MIN_ROW_HEIGHT } from "@/components/Calendar";
import { Menu, setTooltip } from "obsidian";
import CommitmentEl from "./CommitmentEl";
import { useDroppable } from "@dnd-kit/core";
import ScheduleBlock from "@/components/ScheduleBlock";
import TaskButton from "@/components/TaskButton";

export interface DayProps {
    dayInfo: DayInfo;
    thisMonth: boolean;
    controlDown: boolean;
    optionDown: boolean;
}

function Day({ dayInfo, thisMonth, controlDown, optionDown }: DayProps) {
    const { settings, ctx } = useContext(ObsidianContext)!;

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

    const provider = ctx.commitments;

    const key = formatDate(dayInfo.date);

    const subscribe = useCallback(
        (listener: () => void) =>
            provider.subscribe(key, listener),
        [ provider, key ]
    );

    const getSnapshot = useCallback(
        () => provider.getCommitments(dayInfo.date),
        [ provider, dayInfo.date ]
    );

    const commitments = useSyncExternalStore(
        subscribe,
        getSnapshot
    );

    const csWithoutClass = commitments.filter(c => {
        const period = ctx.commitments.getPeriod(c);
        if (period == undefined) return true;

        const found = dayInfo.blocks.some(block => block.period == period);
        return !found;
    });

    const tasks = commitments.filter(c => c.role === "task");
    const done = tasks.filter(c => c.status === "done");

    const hoverShown = controlDown && dayInfo.blocks.length > 0;
    const belowShown = csWithoutClass.length > 0;
    const aboveShown =
        dayInfo.blocks.some(block =>
            commitments.some(c => ctx.commitments.getPeriod(c) == block.period)
        );

    const { setNodeRef, isOver } = useDroppable({
        id: formatDate(dayInfo.date),
        data: {
            type: "day",
            date: dayInfo.date,
        },
    });

    const now = new Date();

    const onNewCommitment = () => {
        ctx.commitments.createNewCommitment().then(async (f) => {
            await ctx.commitments.modifyCommitmentFrontmatter(f, {
                role: "event",
                assigned: toLocalISOString(new Date()),
                due: formatDate(dayInfo.date)
            });
            await ctx.obsidian.openInRightPane(f);
        }).catch(console.error);
    }

    const onNewContextMenu = (e: React.MouseEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();

            onNewCommitment();
        }
    }

    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();

        const menu = new Menu();

        menu.addItem(item =>
            item
                .setTitle("Open daily note")
                .setIcon("calendar")
                .onClick(() => {
                    ctx.dailies.getOrCreateNewDailyNote(dayInfo.date)
                        .then(file => ctx.obsidian.openInRightPane(file))
                        .catch(console.error);
                })
        );

        menu.addSeparator();

        menu.addItem(item =>
            item
                .setTitle("Clear")
                .setIcon("delete")
                .onClick(() => {
                    ctx.commitments.clearAllCommitments(dayInfo.date);
                })
        );

        menu.showAtMouseEvent(e.nativeEvent);
    };

    return (
        <div className={ concat("calendar-day", dayInfo.extraneous?.type, isOver && "drop-target") }
             data-date={ dayInfo.date.toDateString() }
             ref={ setNodeRef }
             style={ dayStyles }
             onContextMenu={ onContextMenu }
        >
            <div className="day-header">
                <div className="day-options">
                    <TaskButton complete={ done.length } total={ tasks.length } onClick={ () => {
                        ctx.dailies.getOrCreateNewDailyNote(dayInfo.date)
                            .then(file => ctx.obsidian.openInRightPane(file))
                            .catch(console.error);
                    } }></TaskButton>
                </div>
                <span className={ concat("day-type") } ref={ tagRef }>
                    { dayInfo.dayType }
                </span>
                <div
                    className={ concat("day-number-container", thisMonth && "this-month", dayInfo.date.toDateString() == now.toDateString() && "today") }
                >
                    { dayInfo.date.getDate() == 1 && MONTHS_OF_YEAR_TRUNC[dayInfo.date.getMonth()] + " " }
                    <span
                        className={ concat(
                            "day-number"
                        ) }
                    >
                        { dayInfo.date.getDate() }
                    </span>
                </div>
            </div>
            <div className="day-container">
                {
                    dayInfo.blocks.map((block, bi) => (
                        <ScheduleBlock block={ block } key={ bi } commitments={ commitments }
                                       dayInfo={ dayInfo } optionDown={optionDown}></ScheduleBlock>
                    ))
                }
                <hr className={ concat(hoverShown && "hover-shown", aboveShown && "above-shown", belowShown && "bottom-shown") }/>
                {
                    csWithoutClass.filter(c => c.role != "task" && c.role != "project").map((comm, ci) => (
                        <CommitmentEl commitment={ comm } draggable={ true } key={ ci } duplicateOnDrag={optionDown}></CommitmentEl>
                    ))
                }
                <div className={ concat("commitment", "new-commitment") } onClick={ onNewCommitment }
                     onContextMenu={ onNewContextMenu }>
                    +
                </div>
            </div>
        </div> );
}

export default memo(Day);
