import schedules from "@/mock/schedules.json";
import { collapseBlockSchedule, DayInfo, parseBlockSchedule, Schedule, sortBlockSchedule } from "@/util/schedule-utils";
import { formatDate } from "@/util/date-utils";

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

        const dateKey = formatDate(date);

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
        if (!schedule.rotation.include_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
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

            if ((schedule.rotation.include_weekends || !isWeekend) && !dayOffs.has(key)) {
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
