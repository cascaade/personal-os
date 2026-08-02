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
