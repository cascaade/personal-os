export const DAYS_OF_WEEK_TRUNC = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS_OF_YEAR_TRUNC = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export enum CalendarFillMode {
    BOTH,
    LEADING,
    TRAILING,
    NONE,
}

export interface LoadedMonth {
    month: Date;
    fillMode: CalendarFillMode;
}

export function getCalendarDays(
    month: Date,
    mode: CalendarFillMode = CalendarFillMode.BOTH
): Date[] {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);

    const firstWeekday = first.getDay(); // Sunday = 0
    const lastWeekday = last.getDay();

    const includeLeading =
        mode === CalendarFillMode.LEADING ||
        mode === CalendarFillMode.BOTH;

    const includeTrailing =
        mode === CalendarFillMode.TRAILING ||
        mode === CalendarFillMode.BOTH;

    const start = new Date(first);
    const end = new Date(last);

    if (includeLeading) {
        start.setDate(start.getDate() - firstWeekday);
    } else if (firstWeekday !== 0) {
        // Skip the partial first week.
        start.setDate(start.getDate() + (7 - firstWeekday));
    }

    if (includeTrailing) {
        end.setDate(end.getDate() + (6 - lastWeekday));
    } else if (lastWeekday !== 6) {
        // Drop the partial last week.
        end.setDate(end.getDate() - (lastWeekday + 1));
    }

    const days: Date[] = [];

    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }

    return days;
}

export function addMonths(date: Date, months: number): Date {
    const result = new Date(date);

    const originalDay = result.getDate();

    // Prevent overflow while changing the month.
    result.setDate(1);
    result.setMonth(result.getMonth() + months);

    // Clamp to the last day of the destination month.
    const lastDay = new Date(
        result.getFullYear(),
        result.getMonth() + 1,
        0
    ).getDate();

    result.setDate(Math.min(originalDay, lastDay));

    return result;
}

/**
 * Converts a time string into minutes since midnight.
 *
 * @param time "8:35", "12:22", "17:30", etc.
 * @param pmMode
 *   null    -> time is already 24-hour.
 *   boolean -> true = PM, false = AM.
 *   number  -> compare parsed time against this threshold.
 *              If parsed minutes < threshold, treat as PM.
 */
export function timeToMinutes(
    time: string,
    pmMode: boolean | number | null
): number {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());

    if (!match) {
        throw new Error(`Invalid time: "${time}"`);
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        minutes < 0 ||
        minutes > 59
    ) {
        throw new Error(`Invalid time: "${time}"`);
    }

    // 24-hour input
    if (pmMode === null) {
        if (hours < 0 || hours > 23) {
            throw new Error(`Invalid 24-hour time: "${time}"`);
        }

        return hours * 60 + minutes;
    }

    // 12-hour validation
    if (hours < 1 || hours > 12) {
        throw new Error(`Invalid 12-hour time: "${time}"`);
    }

    let isPm: boolean;

    if (typeof pmMode === "boolean") {
        isPm = pmMode;
    } else {
        // Threshold comparison
        const parsed = hours * 60 + minutes;
        isPm = parsed < pmMode;
    }

    // Convert to 24-hour minutes
    if (hours === 12) {
        hours = isPm ? 12 : 0;
    } else if (isPm) {
        hours += 12;
    }

    return hours * 60 + minutes;
}
