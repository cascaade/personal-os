import { concat } from "@/util/classname-utils";
import { minutesToTime, MONTHS_OF_YEAR_TRUNC } from "@/util/date-utils";
import { DayInfo } from "@/util/schedule-utils";
import { Commitment, CommitmentsProvider } from "@/services/CommitmentsProvider";
import { memo, useContext, useEffect, useState } from "react";
import { ObsidianContext } from "@/views/CalendarView";

export interface DayProps {
    dayInfo: DayInfo;
    thisMonth: boolean;
}

function Day({ dayInfo, thisMonth }: DayProps) {
    const { settings, calendarContext } = useContext(ObsidianContext)!;

    const [commitments, setCommitments] = useState<Commitment[]>([]);

    useEffect(() => {
        ( async () => setCommitments(await calendarContext.commitments?.getCommitments(dayInfo.date) ?? []) )()
            .catch(() => null);
    }, [ calendarContext.commitments, dayInfo.date ]);

    return (<div className={ concat("calendar-day", dayInfo.extraneous?.type) }>
        <div className="day-header">
            <div className={concat("day-number-container", thisMonth && "this-month", dayInfo.date.toDateString() == new Date().toDateString() && "today")}>
                {dayInfo.date.getDate() == 1 && MONTHS_OF_YEAR_TRUNC[dayInfo.date.getMonth()] + " "}
                <span className={ concat(
                    "day-number"
                ) }>
                    {dayInfo.date.getDate()}
                </span>
            </div>
            <span className={ concat("day-type") }>
                {dayInfo.dayType}
            </span>
            <div className="day-options">
            {/*    0/1*/}
            </div>
        </div>
        <div className="day-container">
            {
                dayInfo.blocks.map((block, bi) => (
                    ( () => {
                        const cs = commitments.filter(c => c.class?.period == block.period || c.project?.class?.period == block.period);

                        return (
                            <div className={ concat("schedule-block", cs.length === 0 && "empty-block") } key={bi}>
                                <div className="block-header">
                                    <span className="block-period">{ block.period }</span>
                                    {" "}
                                    <span className={"block-time"}>{
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
                                        <div className="commitment" key={ci}>
                                            {comm.title}
                                        </div>
                                    ))
                                }
                            </div>
                        )
                    } )()
                ))
            }
            {/*{JSON.stringify(dayInfo, null, 2)}*/}
        </div>
    </div>);
}

export default memo(Day);
