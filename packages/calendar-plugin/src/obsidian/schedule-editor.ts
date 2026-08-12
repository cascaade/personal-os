import { App, Notice, Setting } from 'obsidian';
import { Schedule, ScheduleArraySchema } from '@personal-os/core/dist/utils/schedule-types';
import { TASK_MANAGER_PLUGIN_ID } from "@personal-os/obsidian/dist/config/plugins";

const OTHER_PLUGIN_ID = TASK_MANAGER_PLUGIN_ID;

type SaveCallback = (schedules: Schedule[]) => Promise<void> | void;

export class ScheduleEditor {
    private mode: 'visual' | 'json' = 'visual';
    private jsonError: string | null = null;

    constructor(
        private app: App,
        private containerEl: HTMLElement,
        private getSchedules: () => Schedule[],
        private setSchedules: SaveCallback,
    ) {}

    render(): void {
        this.containerEl.empty();
        this.renderToolbar();
        this.mode === 'visual' ? this.renderVisual() : this.renderJson();
    }

    private renderToolbar(): void {
        const toolbar = this.containerEl.createDiv({ cls: 'schedule-editor-toolbar' });

        new Setting(toolbar)
            .setName('Schedule editor')
            .addButton((btn) =>
                btn.setButtonText(this.mode === 'visual' ? 'Edit as JSON' : 'Edit visually').onClick(() => {
                    this.mode = this.mode === 'visual' ? 'json' : 'visual';
                    this.render();
                }),
            )
            .addButton((btn) =>
                btn.setButtonText('Pull from other plugin').onClick(async () => {
                    const pulled = this.readOtherPlugin();
                    if (!pulled) {
                        new Notice(`Could not find a valid schedule on "${OTHER_PLUGIN_ID}".`);
                        return;
                    }
                    await this.commit(pulled);
                    new Notice('Pulled schedule from other plugin.');
                    this.render();
                }),
            )
            .addButton((btn) =>
                btn.setButtonText('Push to other plugin').onClick(async () => {
                    const ok = await this.writeOtherPlugin(this.getSchedules());
                    new Notice(ok ? 'Pushed schedule to other plugin.' : `Could not find "${OTHER_PLUGIN_ID}" to push to.`);
                }),
            );
    }

    private renderVisual(): void {
        const schedules = this.getSchedules();
        const listEl = this.containerEl.createDiv({ cls: 'schedule-editor-list' });

        schedules.forEach((schedule, scheduleIdx) => {
            const box = listEl.createDiv({ cls: 'schedule-editor-year' });

            new Setting(box)
                .setName(`Year: ${schedule.name}`)
                .addText((text) =>
                    text.setValue(schedule.name).onChange(async (value) => {
                        schedule.name = value;
                        await this.commit(schedules);
                    }),
                )
                .addButton((btn) =>
                    btn
                        .setIcon('trash')
                        .setTooltip('Remove year')
                        .onClick(async () => {
                            schedules.splice(scheduleIdx, 1);
                            await this.commit(schedules);
                            this.render();
                        }),
                );

            new Setting(box)
                .setName('Effective range')
                .addText((text) =>
                    text
                        .setPlaceholder('YYYY-MM-DD')
                        .setValue(schedule.effective_from)
                        .onChange(async (value) => {
                            schedule.effective_from = value;
                            await this.commit(schedules);
                        }),
                )
                .addText((text) =>
                    text
                        .setPlaceholder('YYYY-MM-DD')
                        .setValue(schedule.effective_to)
                        .onChange(async (value) => {
                            schedule.effective_to = value;
                            await this.commit(schedules);
                        }),
                );

            this.renderParsing(box, schedule, schedules);
            this.renderRotation(box, schedule, schedules);
            this.renderDayRegistry(box, schedule, schedules);
        });

        new Setting(listEl).addButton((btn) =>
            btn.setButtonText('+ Add school year').setCta().onClick(async () => {
                schedules.push({
                    name: 'New year',
                    effective_from: '',
                    effective_to: '',
                    day_registry: [],
                    parsing: { twelve_hour_time: true, use_pm_attribute: false, pm_divisor: null },
                    rotation: { collapse: { enabled: true, naming: 'Period %p' }, ordered_list: [], include_weekends: false },
                    extraneous: [],
                });
                await this.commit(schedules);
                this.render();
            }),
        );
    }

    private renderParsing(box: HTMLElement, schedule: Schedule, schedules: Schedule[]): void {
        const el = box.createDiv({ cls: 'schedule-editor-parsing' });
        el.createEl('h4', { text: 'Parsing' });

        new Setting(el)
            .setName('12-hour time')
            .addToggle((toggle) =>
                toggle.setValue(schedule.parsing.twelve_hour_time).onChange(async (value) => {
                    schedule.parsing.twelve_hour_time = value;
                    await this.commit(schedules);
                }),
            )
            .addToggle((toggle) =>
                toggle
                    .setTooltip('Use per-block PM attribute instead of a divisor time')
                    .setValue(schedule.parsing.use_pm_attribute ?? false)
                    .onChange(async (value) => {
                        schedule.parsing.use_pm_attribute = value;
                        await this.commit(schedules);
                    }),
            );

        new Setting(el)
            .setName('PM divisor time')
            .setDesc('Ignored when "use PM attribute" is on. Leave blank for none.')
            .addText((text) =>
                text
                    .setPlaceholder('e.g. 5:00')
                    .setValue(schedule.parsing.pm_divisor ?? '')
                    .onChange(async (value) => {
                        schedule.parsing.pm_divisor = value === '' ? null : value;
                        await this.commit(schedules);
                    }),
            );
    }

    private renderRotation(box: HTMLElement, schedule: Schedule, schedules: Schedule[]): void {
        const el = box.createDiv({ cls: 'schedule-editor-rotation' });
        el.createEl('h4', { text: 'Rotation' });

        new Setting(el)
            .setName('Collapse')
            .addToggle((toggle) =>
                toggle.setValue(schedule.rotation.collapse.enabled).onChange(async (value) => {
                    schedule.rotation.collapse.enabled = value;
                    await this.commit(schedules);
                }),
            )
            .addText((text) =>
                text
                    .setPlaceholder('Naming, e.g. "Period %p"')
                    .setValue(schedule.rotation.collapse.naming ?? '')
                    .onChange(async (value) => {
                        schedule.rotation.collapse.naming = value === '' ? null : value;
                        await this.commit(schedules);
                    }),
            );

        new Setting(el)
            .setName('Ordered rotation list')
            .setDesc('Comma-separated day ids, in rotation order')
            .addText((text) =>
                text
                    .setValue(schedule.rotation.ordered_list.join(', '))
                    .onChange(async (value) => {
                        schedule.rotation.ordered_list = value
                            .split(',')
                            .map((v) => v.trim())
                            .filter((v) => v.length > 0);
                        await this.commit(schedules);
                    }),
            );

        new Setting(el)
            .setName('Include weekends')
            .addToggle((toggle) =>
                toggle.setValue(schedule.rotation.include_weekends).onChange(async (value) => {
                    schedule.rotation.include_weekends = value;
                    await this.commit(schedules);
                }),
            );
    }

    private renderDayRegistry(box: HTMLElement, schedule: Schedule, schedules: Schedule[]): void {
        const dayRegistryEl = box.createDiv({ cls: 'schedule-editor-day-registry' });
        dayRegistryEl.createEl('h4', { text: 'Day registry' });

        schedule.day_registry.forEach((day, dayIdx) => {
            const dayBox = dayRegistryEl.createDiv({ cls: 'schedule-editor-day' });

            new Setting(dayBox)
                .setName(`Day: ${day.label}`)
                .addText((text) =>
                    text.setPlaceholder('id').setValue(day.id).onChange(async (value) => {
                        day.id = value;
                        await this.commit(schedules);
                    }),
                )
                .addText((text) =>
                    text.setPlaceholder('label').setValue(day.label).onChange(async (value) => {
                        day.label = value;
                        await this.commit(schedules);
                    }),
                )
                .addButton((btn) =>
                    btn
                        .setIcon('trash')
                        .setTooltip('Remove day')
                        .onClick(async () => {
                            schedule.day_registry.splice(dayIdx, 1);
                            await this.commit(schedules);
                            this.render();
                        }),
                );

            day.block_schedule.forEach((block, blockIdx) => {
                const blockRow = new Setting(dayBox)
                    .setName(`Period ${block.period}`)
                    .addText((text) =>
                        text.setPlaceholder('label').setValue(block.label).onChange(async (value) => {
                            block.label = value;
                            await this.commit(schedules);
                        }),
                    )
                    .addText((text) =>
                        text.setPlaceholder('from').setValue(block.from).onChange(async (value) => {
                            block.from = value;
                            await this.commit(schedules);
                        }),
                    );

                // 📌 Only shown when your parsing rules use per-block PM flags rather than a divisor.
                if (schedule.parsing.use_pm_attribute) {
                    blockRow.addToggle((toggle) =>
                        toggle
                            .setTooltip('from is PM')
                            .setValue(block.from_pm ?? false)
                            .onChange(async (value) => {
                                block.from_pm = value;
                                await this.commit(schedules);
                            }),
                    );
                }

                blockRow.addText((text) =>
                    text.setPlaceholder('to').setValue(block.to).onChange(async (value) => {
                        block.to = value;
                        await this.commit(schedules);
                    }),
                );

                if (schedule.parsing.use_pm_attribute) {
                    blockRow.addToggle((toggle) =>
                        toggle
                            .setTooltip('to is PM')
                            .setValue(block.to_pm ?? false)
                            .onChange(async (value) => {
                                block.to_pm = value;
                                await this.commit(schedules);
                            }),
                    );
                }

                blockRow.addButton((btn) =>
                    btn
                        .setIcon('trash')
                        .setTooltip('Remove period')
                        .onClick(async () => {
                            day.block_schedule.splice(blockIdx, 1);
                            await this.commit(schedules);
                            this.render();
                        }),
                );
            });

            new Setting(dayBox).addButton((btn) =>
                btn.setButtonText('+ Add period').onClick(async () => {
                    day.block_schedule.push({
                        label: 'New period',
                        period: day.block_schedule.length + 1,
                        from: '8:00',
                        to: '9:00',
                    });
                    await this.commit(schedules);
                    this.render();
                }),
            );
        });

        new Setting(dayRegistryEl).addButton((btn) =>
            btn.setButtonText('+ Add day').onClick(async () => {
                schedule.day_registry.push({ id: '', label: 'New Day', block_schedule: [] });
                await this.commit(schedules);
                this.render();
            }),
        );
    }

    private renderJson(): void {
        const wrap = this.containerEl.createDiv({ cls: 'schedule-editor-json' });
        const textarea = wrap.createEl('textarea', {
            cls: 'schedule-editor-textarea',
            text: JSON.stringify(this.getSchedules(), null, 2),
        });
        textarea.rows = 20;
        textarea.style.width = '100%';
        textarea.style.fontFamily = 'var(--font-monospace)';

        const errorEl = wrap.createDiv({ cls: 'schedule-editor-error' });
        if (this.jsonError) {
            errorEl.setText(this.jsonError);
            errorEl.style.color = 'var(--text-error)';
            errorEl.style.whiteSpace = 'pre-wrap';
        }

        new Setting(wrap).addButton((btn) =>
            btn
                .setButtonText('Apply JSON')
                .setCta()
                .onClick(async () => {
                    const parsed = this.safeJsonParse(textarea.value);
                    if (parsed === undefined) {
                        this.render();
                        return;
                    }
                    const result = ScheduleArraySchema.safeParse(parsed);
                    if (!result.success) {
                        this.jsonError = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
                        this.render();
                        return;
                    }
                    this.jsonError = null;
                    await this.commit(result.data);
                    new Notice('Schedule updated.');
                    this.render();
                }),
        );
    }

    /** Returns undefined (and sets jsonError) on invalid JSON, so the caller knows to bail out. */
    private safeJsonParse(raw: string): unknown {
        try {
            return JSON.parse(raw);
        } catch (e) {
            this.jsonError = e instanceof Error ? e.message : 'Invalid JSON';
            return undefined;
        }
    }

    private async commit(schedules: Schedule[]): Promise<void> {
        await this.setSchedules(schedules);
    }

    // Obsidian's public API doesn't type `app.plugins`, hence the `any` cast below.
    private readOtherPlugin(): Schedule[] | null {
        const other = (this.app as any).plugins?.plugins?.[OTHER_PLUGIN_ID];
        const raw = other?.settings?.schedules;
        const result = ScheduleArraySchema.safeParse(raw);
        return result.success ? result.data : null;
    }

    private async writeOtherPlugin(schedules: Schedule[]): Promise<boolean> {
        const other = (this.app as any).plugins?.plugins?.[OTHER_PLUGIN_ID];
        if (!other?.settings) return false;
        other.settings.schedules = schedules;
        if (typeof other.saveSettings === 'function') {
            await other.saveSettings();
        } else if (typeof other.saveData === 'function') {
            await other.saveData(other.settings);
        }
        return true;
    }
}
