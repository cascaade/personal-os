import { CSSProperties, memo, useContext } from "react";
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

    const now = new Date();

    const nowMinutes = ( now.getHours() * 60 + now.getMinutes() );
    const isNow = nowMinutes >= block.from && nowMinutes <= block.to;

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
