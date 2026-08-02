import { JSX } from "react";
import { concat } from "@/util/classname-utils";
import { MONTHS_OF_YEAR_TRUNC } from "@/util/date-utils";

export interface DayProps {
    date: Date;
    thisMonth: boolean;
}

export default function Day({ date, thisMonth }: DayProps) {
    return (<div className="calendar-day">
        <div className="day-header">
            <span className={ concat(
                "day-number",
                thisMonth && "this-month"
            ) }>
                {date.getDate() == 1 && MONTHS_OF_YEAR_TRUNC[date.getMonth()]} {date.getDate()}
            </span>
            {/*<div className="day-options">*/}
            {/*    0/1*/}
            {/*</div>*/}
        </div>
        <div className="day-container">

        </div>
    </div>);
}
