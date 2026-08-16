import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createContext } from "react";

import PersonalOSContext from "@personal-os/obsidian/dist/services/PersonalOSContext";
import { ChatbotSettings } from "@/settings";
import CalendarPlugin from "@/main";

export const VIEW_TYPE_CHATBOT = "chatbot-view";

export type ObsidianContextProps = {
    readonly app: App;
    readonly ctx: PersonalOSContext;
    readonly settings: ChatbotSettings;
    readonly leaf: WorkspaceLeaf;
}

export const ObsidianContext = createContext<ObsidianContextProps | null>(null);

export class CalendarView extends ItemView {
    private root!: Root;
    private ctx!: PersonalOSContext;

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: CalendarPlugin,
        private settings: ChatbotSettings
    ) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_CHATBOT;
    }

    getDisplayText(): string {
        return "Chatbot";
    }

    getIcon(): string {
        return "bot";
    }

    duplicateLastCommitment() {
        void this.ctx.commitments.duplicateLastCommitment();
    }

    async onOpen() {
        this.root = createRoot(this.contentEl);
        this.ctx = new PersonalOSContext(this.plugin, this.settings);

        this.root.render(
            <ObsidianContext.Provider
                value={ { app: this.plugin.app, ctx: this.ctx, settings: this.settings, leaf: this.leaf } }>

            </ObsidianContext.Provider>,
        );
    }

    async onClose() {
        this.ctx.obsidian.onunload();
        this.root.unmount();
    }
}
