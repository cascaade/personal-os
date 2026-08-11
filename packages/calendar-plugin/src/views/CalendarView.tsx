import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createContext } from "react";

import { Calendar } from "@/components/Calendar";
import PersonalOSContext from "@personal-os/obsidian/dist/services/PersonalOSContext";
import { CalendarSettings } from "@/settings";
import CalendarPlugin from "@/main";

export const VIEW_TYPE_CALENDAR = "calendar-view";

export type ObsidianContextProps = {
    readonly app: App;
    readonly ctx: PersonalOSContext;
    readonly settings: CalendarSettings;
}

export const ObsidianContext = createContext<ObsidianContextProps | null>(null);

export class CalendarView extends ItemView {
    private root!: Root;
    private ctx!: PersonalOSContext;

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: CalendarPlugin,
        private settings: CalendarSettings
    ) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_CALENDAR;
    }

    getDisplayText(): string {
        return "Calendar";
    }

    getIcon(): string {
        return "calendar-check";
    }

    duplicateLastCommitment() {
        void this.ctx.commitments.duplicateLastCommitment();
    }

    async onOpen() {
        this.root = createRoot(this.contentEl);
        this.ctx = new PersonalOSContext(this.plugin, this.settings, VIEW_TYPE_CALENDAR);

        this.root.render(
            <ObsidianContext.Provider
                value={ { app: this.plugin.app, ctx: this.ctx, settings: this.settings } }>
                <Calendar/>
            </ObsidianContext.Provider>,
        );
    }

    async onClose() {
        this.ctx.obsidian.onunload();
        this.root.unmount();
    }
}
