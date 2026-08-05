import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { addMonths, CalendarFillMode, DAYS_OF_WEEK_TRUNC, getCalendarDays, toLocalISOString } from "@/util/date-utils";
import { concat } from "@/util/classname-utils";
import Month from "@/components/Month";

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, } from "@dnd-kit/core";
import { Commitment } from "@/services/CommitmentsProvider";
import { ObsidianContext } from "@/views/CalendarView";

export const MIN_ROW_HEIGHT = 120;
export const ROW_HEIGHT_EASE_TIME_MS = 0;

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
    const { calendarContext } = useContext(ObsidianContext)!;

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

    const lastMousePosition = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return setOptionDown(true);

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            lastMousePosition.current = { x: e.clientX, y: e.clientY };
        };

        container.addEventListener("mousemove", handleMouseMove);

        return () => {
            container.removeEventListener("mousemove", handleMouseMove);
        }
    }, []);

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

    const anchorElRef = useRef<HTMLElement | null>(null);
    const anchorTopRef = useRef(0);
    const anchorHeight = useRef(0);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const captureAnchor = (next: boolean) => {
            const el = document.elementFromPoint(lastMousePosition.current.x, lastMousePosition.current.y);
            const dayEl = el?.closest<HTMLElement>("[data-date]") ?? null;

            const rect = dayEl?.getBoundingClientRect();

            anchorElRef.current = dayEl;
            anchorHeight.current = rect?.height ?? 0;
            anchorTopRef.current = rect?.top ?? 0;

            setOptionDown(next);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Alt") captureAnchor(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Alt") captureAnchor(false);
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

    useLayoutEffect(() => {
        const container = scrollRef.current;
        const dayEl = anchorElRef.current;
        if (!container || !dayEl) return;

        const rect = dayEl.getBoundingClientRect();

        const afterTop = rect.top;
        container.scrollTop += afterTop - anchorTopRef.current;
    }, [optionDown]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // don't start dragging on tiny movements
            },
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over) return;

        const commitment = active.data.current?.commitment as Commitment | undefined;
        const newDate = over.data.current?.date as Date | undefined;

        if (!commitment || !newDate) return;

        // modify values
        let due = new Date();

        if (commitment.due) {
            due = new Date(commitment.due);
            due.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        }

        let start;

        if (commitment.start) {
            start = new Date(commitment.start);
            start.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        }

        // set frontmatter
        calendarContext.commitments.modifyCommitmentFrontmatter(commitment.file, {
            due: toLocalISOString(due),
            start: start ? toLocalISOString(start) : undefined,
        }).catch(console.error);
    }

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

            <DndContext
                sensors={sensors}
                // onDragStart={handleDragStart}
                // onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div
                    className={ concat("calendar-table", optionDown && "option-down") }
                    ref={ scrollRef }
                >
                    { months.map((month, index) => (
                        <Month key={ month.month.getTime() } loadedMonth={ month } monthRefs={ monthRefs } visibleMonth={ visibleMonth }
                               index={ index } optionDown={optionDown}></Month>
                    )) }
                </div>
            </DndContext>
        </div>
    );
}
