import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { createContext } from "react";

import { Calendar } from "@/components/Calendar";

export const VIEW_TYPE_CALENDAR = "calendar-view";

export const ObsidianContext = createContext<App | null>(null);

export class CalendarView extends ItemView {
    private root!: Root;

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: App,
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
            <ObsidianContext.Provider value={this.plugin}>
                <Calendar />
            </ObsidianContext.Provider>,
        );
    }

    async onClose() {
        this.root.unmount();
    }
}
