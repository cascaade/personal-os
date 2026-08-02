import schedules from "@/mock/schedules.json";

type Block = {
    label: string;
    period: number;
    from: string;
    to: string;
}

type ExtraneousDate = {
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
        label: string;
        title: string;
    }

    blocks: Block[];
};

type Schedule = {
    name: string;
    effective_from: string;
    effective_to: string;
    day_registry: {
        id: string;
        label: string;
        block_schedule: Block[]
    }[];
    parsing: {
        use_pm_attribute: boolean;
        pm_divisor: string | null;
    };
    rotation: {
        collapse: {
            enabled: boolean;
            naming: string | null;
        },
        ordered_list: string[]
    }
    extraneous: ExtraneousDate[];
};

class CalendarResolver {
    private cache = new Map<string, DayInfo>();

    private calculate(date: Date): DayInfo {
        const schedule: Schedule = (schedules as Schedule[]).find((schedule: Schedule) => {
            const from = new Date(schedule.effective_from);
            const to = new Date(schedule.effective_to);

            return date >= from && date <= to;
        }) as Schedule;

        if (!schedule) {
            return {
                date,
                dayType: null,
                blocks: [],
            };
        }

        const dateKey = date.toISOString().split("T")[0];

        // Handle explicit overrides first
        const override = schedule.extraneous.find(
            item => item.date === dateKey
        );

        if (override) {
            return {
                date,
                blocks: [],
                dayType: override.type,
                extraneous: {
                    label: override.label,
                    title: override.title,
                }
            };
        }

        const dayOfWeek = date.getDay();

        // Ignore weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
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

            if (!isWeekend && !dayOffs.has(key)) {
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

        return {
            date,
            dayType: registry?.label ?? null,
            blocks: registry?.block_schedule ?? [],
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
