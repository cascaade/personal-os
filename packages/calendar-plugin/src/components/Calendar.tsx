import { useEffect, useRef, useState } from "react";
import Day from "@/components/Day";
import { addMonths, CalendarFillMode, DAYS_OF_WEEK_TRUNC, getCalendarDays, LoadedMonth } from "@/util/date-utils";

export function Calendar() {
    const [months, setMonths] = useState<LoadedMonth[]>(() => {
        const first = new Date();
        first.setDate(1);

        return [
            {
                month: addMonths(first, -3),
                fillMode: CalendarFillMode.LEADING,
            },
            {
                month: addMonths(first, -2),
                fillMode: CalendarFillMode.LEADING,
            },
            {
                month: addMonths(first, -1),
                fillMode: CalendarFillMode.LEADING,
            },
            {
                month: first,
                fillMode: CalendarFillMode.BOTH,
            },
            {
                month: addMonths(first, 1),
                fillMode: CalendarFillMode.TRAILING,
            },
            {
                month: addMonths(first, 2),
                fillMode: CalendarFillMode.TRAILING,
            },
            {
                month: addMonths(first, 3),
                fillMode: CalendarFillMode.TRAILING,
            },
        ];
    });

    const [visibleMonth, setVisibleMonth] = useState(months[3]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const monthRefs = useRef(new Map<number, HTMLDivElement>());

    const loadingTop = useRef(false);
    const loadingBottom = useRef(false);

    const initialized = useRef(false);

    const scrollToCurrentMonth = (smooth: boolean) => {
        const container = scrollRef.current;
        if (!container) return;

        const currentIndex = months.findIndex(
            ({ month }) =>
                month.getFullYear() === new Date().getFullYear() &&
                month.getMonth() === new Date().getMonth()
        );

        if (currentIndex === -1) return;

        requestAnimationFrame(() => {
            const monthEl = monthRefs.current.get(currentIndex);
            if (!monthEl || !container) return;

            const containerRect = container.getBoundingClientRect();
            const monthRect = monthEl.getBoundingClientRect();

            const relativeTop = monthRect.top - containerRect.top + container.scrollTop;
            const target = relativeTop - (container.clientHeight - 60 - monthEl.offsetHeight) / 2;

            if (smooth) {
                container.scrollTo({
                    top: Math.max(0, target),
                    behavior: 'smooth'
                });
            } else {
                container.scrollTop = Math.max(0, target);
            }
        });
    };

    useEffect(() => {
        scrollToCurrentMonth(false);
        initialized.current = true;
    }, []);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const onScroll = () => {
            if (!initialized.current) {
                return;
            }

            const top = container.getBoundingClientRect().top;

            let current = 0;
            let bestScore = -1;

            const viewportTop = container.getBoundingClientRect().top;
            const viewportBottom = container.getBoundingClientRect().bottom - 120; // offset for preception

            monthRefs.current.forEach((el, index) => {
                if (!el) return;

                const rect = el.getBoundingClientRect();

                const visible = Math.max(
                    0,
                    Math.min(rect.bottom, viewportBottom) -
                    Math.max(rect.top, viewportTop)
                );

                const score = visible / rect.height;

                if (score > bestScore) {
                    bestScore = score;
                    current = index;
                }
            });

            setVisibleMonth(months[current]);

            // append
            if (current >= months.length - 2 && !loadingBottom.current) {
                loadingBottom.current = true;

                setMonths(prev => [
                    ...prev,
                    {
                        month: addMonths(prev[prev.length - 1]!.month, 1),
                        fillMode: CalendarFillMode.TRAILING,
                    },
                ]);

                requestAnimationFrame(() => {
                    loadingBottom.current = false;
                });
            }

            // prepend
            if (current <= 1 && !loadingTop.current) {
                loadingTop.current = true;

                const oldHeight = container.scrollHeight;

                setMonths(prev => [
                    {
                        month: addMonths(prev[0]!.month, -1),
                        fillMode: CalendarFillMode.LEADING,
                    },
                    ...prev,
                ]);

                requestAnimationFrame(() => {
                    container.scrollTop += container.scrollHeight - oldHeight;
                    loadingTop.current = false;
                });
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

                    <div className="calendar-options">
                        <button className="to-today-btn" onClick={() => scrollToCurrentMonth(true)}>Today</button>
                    </div>
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
