import { App, PluginSettingTab, Setting } from 'obsidian';
import CalendarPlugin from './main';

export interface CalendarSettings {
    mySetting: string;
}

export const DEFAULT_SETTINGS: CalendarSettings = {
    mySetting: 'default',
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
    }
}
