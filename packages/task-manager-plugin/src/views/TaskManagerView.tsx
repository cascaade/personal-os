import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";

import TaskManager from "@/components/TaskManager";
import { TaskManagerSettings } from "@/settings";
import TaskManagerPlugin from "@/main";
import PersonalOSContext from "@personal-os/obsidian/dist/services/PersonalOSContext";
import { ObsidianContext } from "@/context/ObsidianContext";

export const VIEW_TYPE_TASK_MANAGER = "task-manager-view";

export class TaskManagerView extends ItemView {
    private root!: Root;
    private readonly ctx!: PersonalOSContext;

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: TaskManagerPlugin,
        private settings: TaskManagerSettings
    ) {
        super(leaf);
        this.ctx = new PersonalOSContext(this.plugin, this.settings);
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

        this.root.render(
            <ObsidianContext.Provider
                value={ { app: this.plugin.app, ctx: this.ctx, settings: this.settings, leaf: this.leaf } }>
                <TaskManager/>
            </ObsidianContext.Provider>,
        );
    }

    async onClose() {
        this.root.unmount();
    }
}
