import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createContext } from "react";

import TaskManager from "@/components/TaskManager";
import { TaskManagerSettings } from "@/settings";
import TaskManagerPlugin from "@/main";
import PersonalOSContext from "@personal-os/obsidian/dist/services/PersonalOSContext";

export const VIEW_TYPE_TASK_MANAGER = "task-manager-view";

export type ObsidianContextProps = {
    readonly app: App;
    readonly ctx: PersonalOSContext;
    readonly settings: TaskManagerSettings;
}

export const ObsidianContext = createContext<ObsidianContextProps | null>(null);

export class TaskManagerView extends ItemView {
    private root!: Root;
    private ctx!: PersonalOSContext;

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: TaskManagerPlugin,
        private settings: TaskManagerSettings
    ) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_TASK_MANAGER;
    }

    getDisplayText(): string {
        return "Task Manager";
    }

    getIcon(): string {
        return "square-check";
    }

    async onOpen() {
        this.root = createRoot(this.contentEl);
        this.ctx = new PersonalOSContext(this.plugin, this.settings, VIEW_TYPE_TASK_MANAGER);

        this.root.render(
            <ObsidianContext.Provider
                value={ { app: this.plugin.app, ctx: this.ctx, settings: this.settings } }>
                <TaskManager/>
            </ObsidianContext.Provider>,
        );
    }

    async onClose() {
        this.root.unmount();
    }
}
