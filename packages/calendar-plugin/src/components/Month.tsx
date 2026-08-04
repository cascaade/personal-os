import Day from "@/components/Day";
import { calendarResolver } from "@/services/CalendarResolver";
import { memo, RefObject } from "react";
import { LoadedMonth } from "@/components/Calendar";

export interface MonthProps {
    loadedMonth: LoadedMonth;
    visibleMonth?: LoadedMonth;
    monthRefs: RefObject<Map<number, HTMLDivElement>>;
    index: number;
    optionDown: boolean;
}

function Month({ loadedMonth, monthRefs, index, visibleMonth, optionDown }: MonthProps) {
    const { month } = loadedMonth;

    return (
        <div
            key={month.toISOString()}
            className="calendar-month-section"
            ref={(el) => {
                if (el) {
                    monthRefs.current.set(index, el);
                } else {
                    monthRefs.current.delete(index);
                }
            }}
        >
            {loadedMonth.dates.map((date) => (
                <Day
                    key={date.toISOString()}
                    dayInfo={calendarResolver.get(date)}
                    optionDown={optionDown}
                    thisMonth={
                        date.getFullYear() === visibleMonth?.month.getFullYear() &&
                        date.getMonth() === visibleMonth?.month.getMonth()
                    }
                />
            ))}
        </div>
    );
}

export default memo(Month);
