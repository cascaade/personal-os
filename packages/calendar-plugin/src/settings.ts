import { App, PluginSettingTab, Setting } from 'obsidian';
import CalendarPlugin from './main';
import { Schedule } from '@personal-os/core/dist/utils/schedule-types';
import { ScheduleEditor } from './obsidian/schedule-editor';

export interface CalendarSettings {
    mySetting: string;
    twentyFourHourDisplayTime: boolean;
    showAmPmDisplayTime: boolean;
    commitmentTemplateLocation: string;
    newCommitmentDefaultFolder: string;
    dailyTemplateLocation: string;
    newDailyDefaultFolder: string;
    schedules: Schedule[];
}

export const DEFAULT_SETTINGS: CalendarSettings = {
    mySetting: 'default',
    twentyFourHourDisplayTime: false,
    showAmPmDisplayTime: false,
    commitmentTemplateLocation: 'Templates/Commitment.md',
    newCommitmentDefaultFolder: 'Commitments/',
    dailyTemplateLocation: 'Templates/Daily.md',
    newDailyDefaultFolder: 'Daily/',
    schedules: [],
};

export class CalendarSettingTab extends PluginSettingTab {
    plugin: CalendarPlugin;

    constructor(app: App, plugin: CalendarPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Settings #1')
            .setDesc("It's a secret")
            .addText((text) =>
                text
                    .setPlaceholder('Enter your secret')
                    .setValue(this.plugin.settings.mySetting)
                    .onChange(async (value) => {
                        this.plugin.settings.mySetting = value;
                        await this.plugin.saveSettings();
                    }),
            );

        containerEl.createEl('h3', { text: 'Schedule' });

        new ScheduleEditor(
            this.app,
            containerEl.createDiv(),
            () => this.plugin.settings.schedules,
            async (schedules) => {
                this.plugin.settings.schedules = schedules;
                await this.plugin.saveSettings();
            },
        ).render();
    }
}
