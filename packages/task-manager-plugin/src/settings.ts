import { App, PluginSettingTab, Setting } from 'obsidian';
import TaskManagerPlugin from './main';

export interface TaskManagerSettings {
    mySetting: string;
}

export const DEFAULT_SETTINGS: TaskManagerSettings = {
    mySetting: 'default',
};

export class TaskManagerSettingTab extends PluginSettingTab {
    plugin: TaskManagerPlugin;

    constructor(app: App, plugin: TaskManagerPlugin) {
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
