import { concat } from "@/util/classname-utils";
import { MONTHS_OF_YEAR_TRUNC } from "@/util/date-utils";
import { DayInfo } from "@/util/schedule-utils";
import { Commitment } from "@/util/commitment-utils";

export interface DayProps {
    dayInfo: DayInfo;
    thisMonth: boolean;
    commitments: Commitment[];
}

export default function Day({ dayInfo, thisMonth, commitments }: DayProps) {
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
                commitments.map(c => (
                    <div className="commitment">
                        {c.title}
                    </div>
                ))
            }
            {/*{JSON.stringify(dayInfo, null, 2)}*/}
        </div>
    </div>);
}
