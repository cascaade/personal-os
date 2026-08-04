import { concat } from "@/util/classname-utils";
import { minutesToTime, MONTHS_OF_YEAR_TRUNC } from "@/util/date-utils";
import { DayInfo } from "@/util/schedule-utils";
import { Commitment, CommitmentsProvider } from "@/services/CommitmentsProvider";
import { CSSProperties, memo, useContext, useEffect, useState } from "react";
import { ObsidianContext } from "@/views/CalendarView";
import { MIN_ROW_HEIGHT, ROW_HEIGHT_EASE_TIME_MS } from "@/components/Calendar";

export interface DayProps {
    dayInfo: DayInfo;
    thisMonth: boolean;
    optionDown: boolean;
}

function Day({ dayInfo, thisMonth, optionDown }: DayProps) {
    const { settings, calendarContext } = useContext(ObsidianContext)!;

    const [ commitments, setCommitments ] = useState<Commitment[]>([]);

    const dayStyles = { minHeight: `${ MIN_ROW_HEIGHT }px` } as CSSProperties;
    const blockStyles = { transition: `height ${ ROW_HEIGHT_EASE_TIME_MS }ms ease` } as CSSProperties;

    useEffect(() => {
        ( async () => setCommitments(await calendarContext.commitments?.getCommitments(dayInfo.date) ?? []) )()
            .catch(() => null);
    }, [ calendarContext.commitments, dayInfo.date ]);

    const csWithoutClass = commitments.filter(c => {
        const period = c.class?.period ?? c.project?.class?.period;
        if (period == undefined) return true;

        const found = dayInfo.blocks.some(block => block.period == period);
        return !found;
    });

    const hoverShown = optionDown && dayInfo.blocks.length > 0;
    const belowShown = csWithoutClass.length > 0;
    const aboveShown =
        dayInfo.blocks.some(block =>
            commitments.some(
                c =>
                    c.class?.period === block.period ||
                    c.project?.class?.period === block.period
            )
        );

    if (dayInfo.date.toDateString() == "Thu Sep 03 2026") {
        console.log(aboveShown);
    }


    const now = new Date();

    return (
        <div className={ concat("calendar-day", dayInfo.extraneous?.type) } data-date={ dayInfo.date.toDateString() }
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
                <span className={ concat("day-type") }>
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
                            const cs = commitments.filter(c => c.class?.period == block.period || c.project?.class?.period == block.period);

                            const nowMinutes = (now.getHours() * 60 + now.getMinutes());
                            const isNow = nowMinutes >= block.from && nowMinutes <= block.to;

                            return (
                                <div className={ concat("schedule-block", cs.length === 0 && "empty-block", isNow && "now")}
                                     key={ bi }
                                     style={ blockStyles }>
                                    <div className="block-header">
                                        <span className="block-period">{ block.period }</span>
                                        { " " }
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
                                            <div className="commitment" key={ ci }>
                                                { comm.title }
                                            </div>
                                        ))
                                    }
                                </div>
                            )
                        } )()
                    ))
                }
                <hr className={ concat(hoverShown && "hover-shown", aboveShown && "above-shown", belowShown && "bottom-shown") }/>
                {
                    csWithoutClass.map((comm, ci) => (
                        <div className="commitment" key={ ci }>
                            { comm.title }
                        </div>
                    ))
                }
                <div className={ concat("commitment", "new-commitment") }>
                    +
                </div>
                {/*{JSON.stringify(dayInfo, null, 2)}*/ }
            </div>
        </div> );
}

export default memo(Day);
