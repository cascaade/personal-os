import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { createContext } from "react";

import { Calendar } from "@/components/Calendar";
import { CommitmentProvider } from "@/services/CommitmentProvider";

export const VIEW_TYPE_CALENDAR = "calendar-view";

export type ObsidianContextProps = {
    app: App;
    commitmentProvider: CommitmentProvider;
}

export const ObsidianContext = createContext<ObsidianContextProps | null>(null);

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
            <ObsidianContext.Provider value={ { app: this.plugin, commitmentProvider: new CommitmentProvider(this.app) }}>
                <Calendar />
            </ObsidianContext.Provider>,
        );
    }

    async onClose() {
        this.root.unmount();
    }
}
