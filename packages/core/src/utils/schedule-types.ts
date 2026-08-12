import { z } from 'zod';

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

export const BlockSchema = z.object({
    label: z.string(),
    period: z.number(),
    from: z.string(),
    from_pm: z.boolean().nullable().optional(),
    to: z.string(),
    to_pm: z.boolean().nullable().optional(),
}) satisfies z.ZodType<Block>;

export const ExtraneousDateSchema = z.object({
    date: z.string(),
    label: z.string(),
    title: z.string(),
    type: z.string(),
    schedule: z.string().nullable(),
}) satisfies z.ZodType<ExtraneousDate>;

export const ParsingRulesSchema = z.object({
    twelve_hour_time: z.boolean(),
    use_pm_attribute: z.boolean().optional(),
    pm_divisor: z.string().nullable().optional(),
}) satisfies z.ZodType<ParsingRules>;

export const RotationRulesSchema = z.object({
    collapse: z.object({
        enabled: z.boolean(),
        naming: z.string().nullable(),
    }),
    ordered_list: z.array(z.string()),
    include_weekends: z.boolean(),
}) satisfies z.ZodType<RotationRules>;

export const RegistrySchema = z.object({
    id: z.string(),
    label: z.string(),
    block_schedule: z.array(BlockSchema),
}) satisfies z.ZodType<Registry>;

export const ScheduleSchema = z.object({
    name: z.string(),
    effective_from: z.string(),
    effective_to: z.string(),
    day_registry: z.array(RegistrySchema),
    parsing: ParsingRulesSchema,
    rotation: RotationRulesSchema,
    extraneous: z.array(ExtraneousDateSchema),
}) satisfies z.ZodType<Schedule>;

export const ScheduleArraySchema = z.array(ScheduleSchema);
