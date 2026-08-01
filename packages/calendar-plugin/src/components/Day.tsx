import { JSX } from "react";

export interface DayProps {
    day: number;
}

export default function Day(props: DayProps) {
    return (<div className="calendar-day">
        <div className="day-header">
            <span className="day-number">{props.day}</span>
            <div className="day-options">
                0/1
            </div>
        </div>
        <div className="day-container">

        </div>
    </div>);
}
