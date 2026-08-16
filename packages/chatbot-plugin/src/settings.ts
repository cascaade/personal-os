import { App, PluginSettingTab, Setting } from 'obsidian';
import ChatbotPlugin from './main';

export interface ChatbotSettings {
    mySetting: string;
}

export const DEFAULT_SETTINGS: ChatbotSettings = {
    mySetting: 'default',
};

export class ChatbotSettingTab extends PluginSettingTab {
    plugin: ChatbotPlugin;

    constructor(app: App, plugin: ChatbotPlugin) {
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
