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

class CalendarResolver {
    private cache = new Map<string, DayInfo>();

    private calculate(date: Date): DayInfo {
        const schedule: Schedule = (schedules as Schedule[]).find((schedule: Schedule) => {
            const from = new Date(schedule.effective_from);
            const to = new Date(schedule.effective_to);

            from.setHours(0, 0, 0, 0);
            to.setHours(0, 0, 0, 0);
            to.setDate(to.getDate() + 1);

            return date >= from && date <= to;
        }) as Schedule;

        if (!schedule) {
            return {
                date,
                dayType: null,
                blocks: [],
            };
        }

        let collapse = schedule.rotation.collapse.enabled && schedule.rotation.collapse.naming;

        const dateKey = date.toISOString().split("T")[0];

        // Handle explicit overrides first
        const override = schedule.extraneous.find(
            item => item.date === dateKey
        );

        if (override) {
            let _s = collapseBlockSchedule(
                sortBlockSchedule(
                    parseBlockSchedule(
                        schedule.day_registry.find(s => s.id == override.schedule)?.block_schedule,
                        schedule.parsing
                    )
                ),
                collapse
            );

            return {
                date,
                blocks: _s,
                dayType: override.label,
                extraneous: {
                    type: override.type,
                    title: override.title,
                }
            };
        }

        const dayOfWeek = date.getDay();

        // Ignore weekends
        if (schedule.rotation.include_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
            return {
                date,
                dayType: null,
                blocks: [],
            };
        }

        // Count school days since start of schedule
        let schoolDayCount = 0;

        const current = new Date(schedule.effective_from);

        const dayOffs = new Set(
            schedule.extraneous
                .filter(item => item.type === "day_off")
                .map(item => item.date)
        );

        while (current < date) {
            const weekday = current.getDay();

            const key = [
                current.getFullYear(),
                String(current.getMonth() + 1).padStart(2, "0"),
                String(current.getDate()).padStart(2, "0"),
            ].join("-");

            const isWeekend =
                weekday === 0 ||
                weekday === 6;

            if ((!schedule.rotation.include_weekends || !isWeekend) && !dayOffs.has(key)) {
                schoolDayCount++;
            }

            current.setDate(current.getDate() + 1);
        }

        const rotationIndex =
            schoolDayCount % schedule.rotation.ordered_list.length;

        const rotationId =
            schedule.rotation.ordered_list[rotationIndex];

        const registry =
            schedule.day_registry.find(
                day => day.id.toLowerCase() === rotationId
            );

        let _s = collapseBlockSchedule(
            sortBlockSchedule(
                parseBlockSchedule(
                    registry?.block_schedule,
                    schedule.parsing
                )
            ),
            collapse
        );

        return {
            date,
            dayType: registry?.label ?? null,
            blocks: _s,
        };
    }

    get(date: Date): DayInfo {
        const key = date.toISOString().slice(0,10);

        const cached = this.cache.get(key);

        if (cached) {
            return cached;
        }

        const info = this.calculate(date);

        this.cache.set(key, info);

        return info;
    }

    invalidate(date: Date) {

    }
}

export const calendarResolver = new CalendarResolver();

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
