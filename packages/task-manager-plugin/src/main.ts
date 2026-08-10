import { MarkdownView, Plugin, WorkspaceLeaf, } from 'obsidian';
import { DEFAULT_SETTINGS, TaskManagerSettings, TaskManagerSettingTab, } from './settings';
import { TaskManagerView, VIEW_TYPE_TASK_MANAGER } from "./views/TaskManagerView";
import { createRoot } from "react-dom/client";
import { InlineTaskManagerView } from "@/views/InlineTaskManagerView";

export default class TaskManagerPlugin extends Plugin {
    settings!: TaskManagerSettings;
    inlineView!: InlineTaskManagerView;

    async onload() {
        await this.loadSettings();

        this.inlineView = new InlineTaskManagerView(this, this.settings);

        this.registerView(
            VIEW_TYPE_TASK_MANAGER,
            (leaf) => new TaskManagerView(leaf, this, this.settings),
        );

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                void this.inlineView.sync(view);
            })
        );

        this.registerEvent(
            this.app.workspace.on('editor-change', () => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                void this.inlineView.sync(view);
            })
        );

        const openTaskManager = async () => {
            let leaf: WorkspaceLeaf | undefined | null =
                this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_MANAGER)[0];

            if (!leaf) {
                leaf = this.app.workspace.getLeaf(true);

                if (!leaf) return;

                await leaf.setViewState({
                    type: VIEW_TYPE_TASK_MANAGER,
                    active: true,
                });
            }

            await this.app.workspace.revealLeaf(leaf);
        }

        const ribbonIcon = this.addRibbonIcon('square-check', 'Open task manager', async (_evt: MouseEvent) => {
            await openTaskManager();
        });

        ribbonIcon.addClass("task-manager-ribbon-icon");

        this.addSettingTab(new TaskManagerSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            ( await this.loadData() ) as Partial<TaskManagerSettings>,
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        this.inlineView?.unmountAll();
    }
}
