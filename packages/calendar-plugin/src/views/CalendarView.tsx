import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createContext } from "react";

import { Calendar } from "@/components/Calendar";
import { CalendarContext } from "@/services/CalendarContext";
import { CalendarSettings } from "@/settings";
import CalendarPlugin from "@/main";

export const VIEW_TYPE_CALENDAR = "calendar-view";

export type ObsidianContextProps = {
    readonly app: App;
    readonly calendarContext: CalendarContext;
    readonly settings: CalendarSettings;
}

export const ObsidianContext = createContext<ObsidianContextProps | null>(null);

export class CalendarView extends ItemView {
    private root!: Root;
    private calendarContext!: CalendarContext;

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
        void this.calendarContext.commitments.duplicateLastCommitment();
    }

    async onOpen() {
        this.root = createRoot(this.contentEl);
        this.calendarContext = new CalendarContext(this.plugin, this.settings);

        this.root.render(
            <ObsidianContext.Provider
                value={ { app: this.plugin.app, calendarContext: this.calendarContext, settings: this.settings } }>
                <Calendar/>
            </ObsidianContext.Provider>,
        );
    }

    async onClose() {
        this.calendarContext.obsidian.onunload();
        this.root.unmount();
    }
}
