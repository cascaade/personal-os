import schedules from "@/mock/schedules.json";
import { timeToMinutes } from "@/util/date-utils";

export type Block = {
    label: string;
    period: number;
    from: string;
    from_pm?: boolean | null;
    to: string;
    to_pm?: boolean | null;
}

export type ParsedBlock = {
    label: string;
    period: number;
    from: number;
    to: number;
}

export type ExtraneousDate = {
    date: string;
    label: string;
    title: string;
    type: string;
    schedule: string | null;
}

export type DayInfo = {
    date: Date;
    dayType: string | null;
    extraneous?: {
        type: string;
        title: string;
    }
    blocks: ParsedBlock[];
};

export type ParsingRules = {
    twelve_hour_time: boolean;
    use_pm_attribute?: boolean;
    pm_divisor?: string | null;
};

export type RotationRules = {
    collapse: {
        enabled: boolean;
        naming: string | null;
    },
    ordered_list: string[];
    include_weekends: boolean;
}

export type Registry = {
    id: string;
    label: string;
    block_schedule: Block[];
}

export type Schedule = {
    name: string;
    effective_from: string;
    effective_to: string;
    day_registry: Registry[];
    parsing: ParsingRules;
    rotation: RotationRules;
    extraneous: ExtraneousDate[];
};

export function parseBlockSchedule(schedule: Block[] | undefined, parsing: ParsingRules): ParsedBlock[] {
    if (!schedule || schedule.length === 0) return [];

    let newSchedule: ParsedBlock[] = [];

    let pmMode = !parsing.twelve_hour_time ? null : timeToMinutes(parsing.pm_divisor!, false);

    for (const block of schedule) {
        newSchedule.push({
            label: block.label,
            period: block.period,
            from: timeToMinutes(block.from, block.from_pm ?? pmMode),
            to: timeToMinutes(block.to, block.from_pm ?? pmMode),
        })
    }

    return newSchedule;
}

export function sortBlockSchedule(schedule: ParsedBlock[] | undefined): ParsedBlock[] {
    if (!schedule || schedule.length === 0) return [];

    return schedule.sort((a, b) => a.from - b.from);
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
    schedule: ParsedBlock[] | undefined,
    namingFormat: string | false | null
): ParsedBlock[] {
    if (!schedule || schedule.length === 0) return [];

    if (!namingFormat) {
        return schedule;
    }

    schedule = sortBlockSchedule(schedule);

    const collapsed: ParsedBlock[] = [];

    let current = { ...schedule[0] } as ParsedBlock;

    for (let i = 1; i < schedule.length; i++) {
        const next = schedule[i]!;

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
