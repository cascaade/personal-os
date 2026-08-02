export interface BlockScheduleEntry {
    label: string;
    period: number;
    from: string;
    to: string;
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
export function parseTime(
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

/**
 * Collapses consecutive schedule blocks that share the same period.
 *
 * Example:
 *
 * [1][1][2][2][2][3]
 *
 * becomes
 *
 * [1][2][3]
 *
 * using the first block's "from" and the last block's "to".
 *
 * If namingFormat is null, the original schedule is returned unchanged.
 */
export function collapseBlockSchedule(
    schedule: BlockScheduleEntry[],
    namingFormat: string | null
): BlockScheduleEntry[] {
    if (namingFormat === null) {
        return schedule;
    }

    if (schedule.length === 0) {
        return [];
    }

    const collapsed: BlockScheduleEntry[] = [];

    let current: BlockScheduleEntry = { ...schedule[0] } as BlockScheduleEntry;

    for (let i = 1; i < schedule.length; i++) {
        const next: BlockScheduleEntry = schedule[i]!;

        if (next.period === current.period) {
            // Extend current block
            current.to = next.to;
        } else {
            current.label = namingFormat.replace("%p", String(current.period));
            collapsed.push(current);

            current = { ...next };
        }
    }

    current.label = namingFormat.replace("%p", String(current.period));
    collapsed.push(current);

    return collapsed;
}
