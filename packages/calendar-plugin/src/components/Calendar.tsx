import { useEffect, useRef, useState } from "react";
import { addMonths, CalendarFillMode, DAYS_OF_WEEK_TRUNC, getCalendarDays } from "@/util/date-utils";
import { concat } from "@/util/classname-utils";
import Month from "@/components/Month";

const MIN_ROW_HEIGHT = 120;

export interface LoadedMonth {
    month: Date;
    fillMode: CalendarFillMode;
    dates: Date[];
}

function createLoadedMonth(first: Date, fillMode: CalendarFillMode) {
    return {
        month: first,
        fillMode: fillMode,
        dates: getCalendarDays(first, fillMode)
    };
}

export function Calendar() {
    const [ months, setMonths ] = useState<LoadedMonth[]>(() => {
        const first = new Date();
        first.setDate(1);

        return [
            createLoadedMonth(
                addMonths(first, -3),
                CalendarFillMode.TRAILING,
            ),
            createLoadedMonth(
                addMonths(first, -2),
                CalendarFillMode.TRAILING,
            ),
            createLoadedMonth(
                addMonths(first, -1),
                CalendarFillMode.TRAILING,
            ),
            createLoadedMonth(
                first,
                CalendarFillMode.NONE,
            ),
            createLoadedMonth(
                addMonths(first, 1),
                CalendarFillMode.LEADING,
            ),
            createLoadedMonth(
                addMonths(first, 2),
                CalendarFillMode.LEADING,
            ),
            createLoadedMonth(
                addMonths(first, 3),
                CalendarFillMode.LEADING,
            ),
        ];
    });

    const [ visibleMonth, setVisibleMonth ] = useState(months[3]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const monthRefs = useRef(new Map<number, HTMLDivElement>());

    const loadingTop = useRef(false);
    const loadingBottom = useRef(false);

    const initialized = useRef(false);

    const scrollToCurrentMonth = (smooth: boolean) => {
        const container = scrollRef.current;
        if (!container) return;

        const now = new Date();

        const currentIndex = months.findIndex(
            ({ month }) =>
                month.getFullYear() === now.getFullYear() &&
                month.getMonth() === now.getMonth()
        );

        if (currentIndex === -1) return;

        requestAnimationFrame(() => {
            const monthEl = monthRefs.current.get(currentIndex);
            if (!monthEl) return;

            const containerRect = container.getBoundingClientRect();
            const monthRect = monthEl.getBoundingClientRect();

            const relativeTop =
                monthRect.top - containerRect.top + container.scrollTop;

            const centeredTarget =
                relativeTop -
                ( container.clientHeight - MIN_ROW_HEIGHT - monthEl.offsetHeight ) / 2;

            const target = Math.min(centeredTarget, relativeTop);

            if (smooth) {
                container.scrollTo({
                    top: Math.max(0, target),
                    behavior: "smooth",
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

        let lastUpdate = 0;

        const onScroll = () => {
            if (!initialized.current) {
                return;
            }

            const now = Date.now();

            if (now - lastUpdate < 100) {
                return;
            }

            lastUpdate = now;

            let current = 0;
            let bestScore = -1;

            const viewportTop = container.getBoundingClientRect().top;
            const viewportBottom = container.getBoundingClientRect().bottom - MIN_ROW_HEIGHT; // offset for preception

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
                    createLoadedMonth(
                        addMonths(prev[prev.length - 1]!.month, 1),
                        CalendarFillMode.LEADING,
                    ),
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
                    createLoadedMonth(
                        addMonths(prev[0]!.month, -1),
                        CalendarFillMode.TRAILING,
                    ),
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
    }, [ months ]);

    const [ optionDown, setOptionDown ] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Alt") {
                setOptionDown(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Alt") {
                setOptionDown(false);
            }
        };

        const handleBlur = () => setOptionDown(false);

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    return (
        <div className="calendar-view">
            <div className="calendar-header">
                <div className="calendar-banner">
                    <div className="calendar-month">
                        { visibleMonth?.month.toLocaleString(undefined, {
                            month: "long",
                            year: "numeric",
                        }) }
                    </div>

                    <div className="calendar-options">
                        <button className="to-today-btn" onClick={ () => scrollToCurrentMonth(true) }>Today</button>
                    </div>
                </div>

                <div className="calendar-labels">
                    { DAYS_OF_WEEK_TRUNC.map((day) => (
                        <div className="calendar-label" key={ day }>
                            { day }
                        </div>
                    )) }
                </div>
            </div>

            <div
                className={ concat("calendar-table", optionDown && "option-down") }
                ref={ scrollRef }
            >
                { months.map((month, index) => (
                    <Month key={ index } loadedMonth={ month } monthRefs={ monthRefs } visibleMonth={ visibleMonth }
                           index={ index }></Month>
                )) }
            </div>
        </div>
    );
}
