# Schedule Save Format

## Common Understanding
1. All string dates are represented in `YYYY-MM-DD` format
2. All string times are represented in `HH:mm` format
3. All number times represent minutes since midnight local time

## Types Consistent with JSON
Types that match raw JSON data directly.

### JSON
`schedules.json` is an array of Schedule objects:
```ts
import schedules from "@/mock/schedules.json"; //: Schedule[]
```

### Schedule
Each Schedule represents a set length of time when different daily schedules rotate.

```ts
export type Schedule = {
    name: string; // name of schedule
    effective_from: string; // YYYY-MM-DD; first day of rotating schedule
    effective_to: string; // YYYY-MM-DD; last day of rotating schedule
    day_registry: Registry[]; // a registry of all daily schedules this schedule may include
    extraneous: ExtraneousDate[]; // any days that fall out of the default rotation
    rotation: RotationRules; 
    parsing: ParsingRules; 
};
```

### Registry
Each registry represents a different schedule a day may have. A list of these objects registers a set of possible schedules the calendar may have to display.
```ts
export type Registry = {
    id: string; // the id of the schedule registry
    label: string; // 
    block_schedule: Block[];
}
```

### Block
Each block represents one period of time inside a schedule.
```ts
export type Block = {
    label: string; // name shown for the block
    period: number; // the block's id
    from: string; // HH:mm; the start time of the block
    from_pm?: boolean | null; // only present if `twelve_hour_time` is true and `use_pm_attribute` is true; true if `from` represents a PM value;
    to: string; // HH:mm; the end time of the block
    to_pm?: boolean | null; // only present if `twelve_hour_time` is true and `use_pm_attribute` is true; true if `to` represents a PM value;
}
```

### ExtraneousDate
Each extraneous date object represents a date that is an exception to the default schedule rotation.

```ts
export type ExtraneousDate = {
    date: string; // YYYY-MM-DD; the date
    label: string; // a label, shown instead of the active schedule label
    title: string; // a secondary label, shown when hovering on the label
    type: string; // the type of deviation, such as "day_off" or "early_dismissal"
    schedule: string | null; // the `id` of the replacement schedule, or null for an empty schedule
}
```

There are some values where the `type` property of this object affects the entire calendar. One example includes `"day_off"`, in which the day is completely skipped within the rotation.

### Rotation Rules
Represents a set of rules regarding how the schedule determines a day's schedule
```ts
export type RotationRules = {
    collapse: {
        enabled: boolean; // if the schedule should collapse all consecutive blocks with the same id
        naming: string | null; // the naming convention for the newly formed block, replacing %p with the period number; null ONLY if enabled is false
    },
    ordered_list: string[]; // the list of schedule registry ids in rotation order
    include_weekends: boolean; // if the rotation should include weekends
}
```
> [!WARNING]
> If `naming == null` when `enabled == true`, errors **will** occur.

### Parsing Rules
Represents a set of rules regarding how the algorithms parse time strings
```ts
export type ParsingRules = {
    twelve_hour_time: boolean; // true if the algorithms should parse times as 12-hour times instead of 24-hour
    pm_divisor?: string | null; // 24-hour HH:mm; more information below.
};
```
The `pm_divisor` is a useful tool for those looking to use standard 12-hour time characters in JSON to represent both AM and PM times. A schedule is only eligible to use this feature if its blocks can all fit in under a 12-hour span.

The `pm_divisor` divides times into AM and PM. Everything parsed to be before the divisor is PM, and everything parsed to be after the divisor is AM. For example, let's say you had a schedule that spanned from 9am to 5pm. An example divisor could be `7:00`. Here's how the resulting times would look:

| Raw Time | Parsed 24h Time | Parsed 24h Time (using divisor) |
|:--------:|:---------------:|:-------------------------------:|
|   9:00   |      09:00      |              09:00              |
|  10:30   |      10:30      |              10:30              |
|  12:00   |      12:00      |              12:00              |
|   2:30   |      02:30      |              14:30              |
|   5:00   |      05:00      |              17:00              |
|   8:00   |      08:00      |              08:00              |

## Code-Only Parsed Types
Types that are used only by the code algorithms to interpret raw JSON data, but are still relevant to schedules formatting.

### DayInfo
A DayInfo object represents information about a given day.
```ts
export type DayInfo = {
    date: Date; // the date
    dayType: string | null; // the schedule name, extraneous day label, or nothing if there's no schedule at all
    extraneous?: { // extraneous day information; only present if day exists in extraneous set
        type: string; // extraneous type, such as "day_off" or "early_dismissal"
        title: string; // extraneous day type hover information, also described as the "secondary label"
    }
    blocks: ParsedBlock[]; // the parsed block schedule
};
```

### ParsedBlock
A ParsedBlock is a Block, but parsed. This means taking the string time values and converting them into numbers.
```ts
export type ParsedBlock = {
    label: string; // the block's label
    period: number; // the block's id
    from: number; // the start time of the block
    to: number; // the end time of the block
}
```

## Sample `schedules.json`

> [!NOTE]
> \** coming soon \**
