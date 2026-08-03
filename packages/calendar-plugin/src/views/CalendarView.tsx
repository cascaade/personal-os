import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { createContext } from "react";

import { Calendar } from "@/components/Calendar";
import { CommitmentsProvider } from "@/services/CommitmentsProvider";
import { CalendarContext } from "@/services/CalendarContext";
import { CalendarSettings } from "@/settings";

export const VIEW_TYPE_CALENDAR = "calendar-view";

export type ObsidianContextProps = {
    readonly app: App;
    readonly calendarContext: CalendarContext;
    readonly settings: CalendarSettings;
}

export const ObsidianContext = createContext<ObsidianContextProps | null>(null);

export class CalendarView extends ItemView {
    private root!: Root;

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: App,
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

    async onOpen() {
        this.root = createRoot(this.contentEl);

        this.root.render(
            <ObsidianContext.Provider value={ { app: this.plugin, calendarContext: new CalendarContext(this.app), settings: this.settings }}>
                <Calendar />
            </ObsidianContext.Provider>,
        );
    }

    async onClose() {
        this.root.unmount();
    }
}
