export const DAYS_OF_WEEK_TRUNC = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS_OF_YEAR_TRUNC = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export enum CalendarFillMode {
    BOTH,
    LEADING,
    TRAILING,
    NONE,
}

export function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

export function parseLocalDate(value: string | Date): Date {
    if (value instanceof Date) return value;

    const [datePart, timePart] = value.split("T");

    const [year, month, day] = datePart!.split("-").map(Number);

    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let milliseconds = 0;

    if (timePart) {
        const [time, fractional] = timePart.split(".");

        [hours = 0, minutes = 0, seconds = 0] = time!
            .split(":")
            .map(Number);

        if (fractional) {
            milliseconds = Number(fractional.padEnd(3, "0").slice(0, 3));
        }
    }

    return new Date(
        year ?? 0,
        (month ?? 0) - 1,
        day,
        hours,
        minutes,
        seconds,
        milliseconds
    );
}

const calendarDaysCache = new Map<string, Date[]>();

function getCalendarDaysCacheKey(month: Date, mode: CalendarFillMode): string {
    return `${month.getFullYear()}-${month.getMonth()}-${mode}`;
}

export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function toLocalISOString(date: Date): string {
    const offset = date.getTimezoneOffset() * 60000; // minutes to ms
    const localTime = new Date(date.getTime() - offset);
    return localTime.toISOString().slice(0, -1); // drop the trailing "Z"
}

export function getCalendarDays(
    month: Date,
    mode: CalendarFillMode
): Date[] {
    const cacheKey = getCalendarDaysCacheKey(month, mode);

    const cached = calendarDaysCache.get(cacheKey);
    if (cached) {
        // Return a copy so callers can't mutate our cached Date objects.
        return cached.map((d) => new Date(d));
    }

    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);

    const firstWeekday = first.getDay();
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

    calendarDaysCache.set(cacheKey, days);

    return days.map((d) => new Date(d));
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
        const parsed = (hours % 12) * 60 + minutes;
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

export function minutesToTime(
    totalMinutes: number,
    twentyFourHour: boolean,
    showAmPm: boolean
): string {
    if (
        !Number.isInteger(totalMinutes) ||
        totalMinutes < 0 ||
        totalMinutes >= 24 * 60
    ) {
        throw new Error(`Invalid minutes: ${totalMinutes}`);
    }

    const hours24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (twentyFourHour) {
        return `${hours24.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`;
    }

    const isPm = hours24 >= 12;
    const hours12 = hours24 % 12 || 12;

    return `${hours12}:${minutes
        .toString()
        .padStart(2, "0")}${showAmPm ? (isPm ? "p" : "a") : ""}`;
}

export function getDayGap(from: Date, to: Date): number {
    const fromDay = new Date(from);
    const toDay = new Date(to);

    fromDay.setHours(0, 0, 0, 0);
    toDay.setHours(0, 0, 0, 0);

    return Math.round(
        (toDay.getTime() - fromDay.getTime()) / (1000 * 60 * 60 * 24)
    );
}

export function dateToMinutes(date: Date) {
    return date.getMinutes() + date.getHours() * 60;
}

const NUMBER_WORDS = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
    "twenty",
];

type RelativeDateOptions = {
    longNumbers?: boolean;
    now?: Date;
    excludeSpecificTime?: boolean;
};



export function relativeDate(
    date: Date,
    {
        longNumbers = false,
        excludeSpecificTime = false,
        now = new Date(),
    }: RelativeDateOptions = {},
): string {
    const target = date.getTime();
    const current = now.getTime();

    const startOfDay = (d: Date): number => {
        const result = new Date(d);
        result.setHours(0, 0, 0, 0);
        return result.getTime();
    };

    /*
     * When specific time is excluded, only compare calendar dates.
     * Hours, minutes, seconds, and milliseconds are completely ignored.
     */
    if (excludeSpecificTime) {
        const targetDay = startOfDay(date);
        const currentDay = startOfDay(now);
        const DAY = 24 * 60 * 60 * 1000;

        const dayDifference = Math.round(
            (targetDay - currentDay) / DAY,
        );

        if (dayDifference === 0) {
            return "today";
        }

        if (dayDifference === 1) {
            return "tomorrow";
        }

        if (dayDifference === -1) {
            return "yesterday";
        }
    }

    if (target === current) {
        return "now";
    }

    const future = target > current;
    const absoluteMs = Math.abs(target - current);

    const number = (n: number) =>
        longNumbers && n <= 20 ? NUMBER_WORDS[n] : n.toString();

    const phrase = (
        n: number,
        unit: string,
        past: boolean,
    ) => {
        const value = number(n);
        const plural = n !== 1 ? "s" : "";

        return past
            ? `${value} ${unit}${plural} ago`
            : `in ${value} ${unit}${plural}`;
    };

    const sameDay = startOfDay(date) === startOfDay(now);

    const tomorrowStart = new Date(now);
    tomorrowStart.setHours(0, 0, 0, 0);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const yesterdayStart = new Date(now);
    yesterdayStart.setHours(0, 0, 0, 0);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    /*
     * Precise time.
     *
     * Same-day events get a 6-hour window.
     *
     * Across midnight, the precise-time window is allowed to
     * extend at most 3 hours into the adjacent calendar day.
     */
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const HOUR = 60 * 60 * 1000;
    const MINUTE = 60 * 1000;
    const SECOND = 1000;

    const withinPreciseWindow = (() => {
        if (sameDay) {
            return absoluteMs <= SIX_HOURS;
        }

        if (future) {
            // Tomorrow can enter the precise-time window, but
            // never more than 3 hours past midnight.
            if (startOfDay(date) === tomorrowStart.getTime()) {
                const timeSinceMidnight =
                    target - tomorrowStart.getTime();

                return (
                    absoluteMs <= SIX_HOURS &&
                    timeSinceMidnight <= THREE_HOURS
                );
            }

            return false;
        }

        // Symmetric rule for yesterday.
        if (startOfDay(date) === yesterdayStart.getTime()) {
            const timeUntilMidnight =
                yesterdayStart.getTime() + 24 * HOUR - target;

            return (
                absoluteMs <= SIX_HOURS &&
                timeUntilMidnight <= THREE_HOURS
            );
        }

        return false;
    })();

    if (withinPreciseWindow) {
        if (absoluteMs < MINUTE) {
            return phrase(
                Math.floor(absoluteMs / SECOND),
                "second",
                !future,
            );
        }

        if (absoluteMs < HOUR) {
            return phrase(
                Math.floor(absoluteMs / MINUTE),
                "minute",
                !future,
            );
        }

        return phrase(
            Math.floor(absoluteMs / HOUR),
            "hour",
            !future,
        );
    }

    /*
     * Calendar-relative day names.
     */

    const targetDay = startOfDay(date);
    const today = startOfDay(now);

    if (targetDay === today) {
        return "today";
    }

    if (targetDay === tomorrowStart.getTime()) {
        return "tomorrow";
    }

    if (targetDay === yesterdayStart.getTime()) {
        return "yesterday";
    }

    /*
     * Days
     *
     * <= 10 days stays in days.
     */
    const DAY = 24 * HOUR;
    const days = Math.floor(absoluteMs / DAY);

    if (days <= 10) {
        return phrase(days, "day", !future);
    }

    /*
     * Weeks
     *
     * Future: <= 12 weeks
     * Past:   <= 6 weeks
     */
    const WEEK = 7 * DAY;
    const weeks = Math.floor(absoluteMs / WEEK);

    if (future && weeks <= 12) {
        if (weeks === 1) {
            return "next week";
        }

        return phrase(weeks, "week", false);
    }

    if (!future && weeks <= 6) {
        if (weeks === 1) {
            return "last week";
        }

        return phrase(weeks, "week", true);
    }

    /*
     * Calendar months.
     *
     * Calculate whole calendar-month distance rather than
     * treating a month as a fixed number of milliseconds.
     */
    const monthDifference = (
        from: Date,
        to: Date,
    ): number => {
        return (
            (to.getFullYear() - from.getFullYear()) * 12 +
            (to.getMonth() - from.getMonth())
        );
    };

    const months = Math.abs(monthDifference(now, date));

    /*
     * A date in the immediately adjacent calendar month gets
     * "last month" / "next month".
     */
    if (future && monthDifference(now, date) === 1) {
        return "next month";
    }

    if (!future && monthDifference(now, date) === -1) {
        return "last month";
    }

    /*
     * <= 12 months from the current calendar month stays in months.
     */
    if (months <= 12) {
        return phrase(months, "month", !future);
    }

    /*
     * Calendar years.
     */
    const yearDifference =
        date.getFullYear() - now.getFullYear();

    if (future && yearDifference === 1) {
        return "next year";
    }

    if (!future && yearDifference === -1) {
        return "last year";
    }

    const years = Math.abs(yearDifference);

    return phrase(years, "year", !future);
}
