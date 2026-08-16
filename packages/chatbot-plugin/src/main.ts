import { Plugin, WorkspaceLeaf, } from 'obsidian';
import { ChatbotSettings, ChatbotSettingTab, DEFAULT_SETTINGS, } from './settings';
import { CalendarView, VIEW_TYPE_CHATBOT } from "./views/ChatbotView";

export default class ChatbotPlugin extends Plugin {
    settings!: ChatbotSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            VIEW_TYPE_CHATBOT,
            (leaf) => new CalendarView(leaf, this, this.settings),
        );

        const openChatbot = async () => {
            let leaf: WorkspaceLeaf | undefined | null =
                this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0];

            if (!leaf) {
                leaf = this.app.workspace.getLeaf(true);

                if (!leaf) return;

                await leaf.setViewState({
                    type: VIEW_TYPE_CHATBOT,
                    active: true,
                });
            }

            await this.app.workspace.revealLeaf(leaf);
        }

        const ribbonIcon = this.addRibbonIcon('bot', 'Open chatbot', async (_evt: MouseEvent) => {
            await openChatbot();
        });

        ribbonIcon.addClass("chatbot-ribbon-icon");

        this.addCommand({
            id: "open-chatbot",
            name: "Open Chatbot",
            callback: openChatbot
        });

        this.addSettingTab(new ChatbotSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            ( await this.loadData() ) as Partial<ChatbotSettings>,
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {

    }
}
