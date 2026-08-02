import { useEffect, useRef, useState } from "react";
import Day from "@/components/Day";
import { addMonths, CalendarFillMode, DAYS_OF_WEEK_TRUNC, getCalendarDays, LoadedMonth } from "@/util/date-utils";

export function Calendar() {
    const [months, setMonths] = useState<LoadedMonth[]>(() => {
        const first = new Date();
        first.setDate(1);

        return [
            {
                month: first,
                fillMode: CalendarFillMode.LEADING,
            },
            {
                month: addMonths(first, 1),
                fillMode: CalendarFillMode.LEADING,
            },
            {
                month: addMonths(first, 2),
                fillMode: CalendarFillMode.LEADING,
            },
            {
                month: addMonths(first, 3),
                fillMode: CalendarFillMode.LEADING,
            },
        ];
    });

    const [visibleMonth, setVisibleMonth] = useState(months[0]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const monthRefs = useRef(new Map<number, HTMLDivElement>());

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const onScroll = () => {
            const top = container.getBoundingClientRect().top;

            let current = 0;

            monthRefs.current.forEach((el, index) => {
                if (!el) return;

                const y = el.getBoundingClientRect().top;

                if (y <= top + 1) {
                    current = index;
                }
            });

            setVisibleMonth(months[current]);

            if (current >= months.length - 2) {
                setMonths(prev => [
                    ...prev,
                    {
                        month: addMonths(prev[prev.length - 1]!.month, 1),
                        fillMode: CalendarFillMode.TRAILING,
                    },
                ]);
            }
        };

        container.addEventListener("scroll", onScroll);
        onScroll();

        return () => container.removeEventListener("scroll", onScroll);
    }, [months]);

    return (
        <div className="calendar-view">
            <div className="calendar-header">
                <div className="calendar-banner">
                    <div className="calendar-month">
                        {visibleMonth?.month.toLocaleString(undefined, {
                            month: "long",
                            year: "numeric",
                        })}
                    </div>

                    <div className="calendar-options" />
                </div>

                <div className="calendar-labels">
                    {DAYS_OF_WEEK_TRUNC.map((day) => (
                        <div className="calendar-label" key={day}>
                            {day}
                        </div>
                    ))}
                </div>
            </div>

            <div
                className="calendar-table"
                ref={scrollRef}
            >
                {months.map(({ month, fillMode }, index) => (
                    <div
                        key={month.toISOString()}
                        className="calendar-month-section"
                        data-index={index}
                        ref={(el) => {
                            if (el) {
                                monthRefs.current.set(index, el);
                            } else {
                                monthRefs.current.delete(index);
                            }
                        }}
                    >
                        {getCalendarDays(month, fillMode).map((date) => (
                            <Day
                                key={date.toISOString()}
                                date={date}
                                thisMonth={
                                    date.getFullYear() === visibleMonth?.month.getFullYear() &&
                                    date.getMonth() === visibleMonth?.month.getMonth()
                                }
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
