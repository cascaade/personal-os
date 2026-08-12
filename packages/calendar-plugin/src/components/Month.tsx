import Day from "@/components/Day";
import { memo, RefObject, useContext } from "react";
import { LoadedMonth } from "@/components/Calendar";
import { ObsidianContext } from "@/views/CalendarView";

export interface MonthProps {
    loadedMonth: LoadedMonth;
    visibleMonth?: LoadedMonth;
    monthRefs: RefObject<Map<number, HTMLDivElement>>;
    index: number;
    controlDown: boolean;
    optionDown: boolean;
}

function Month({ loadedMonth, monthRefs, index, visibleMonth, controlDown, optionDown }: MonthProps) {
    const { ctx } = useContext(ObsidianContext)!;

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
                    dayInfo={ctx.scheduleResolver.get(date)}
                    controlDown={controlDown}
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
