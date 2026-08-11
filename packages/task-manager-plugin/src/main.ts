import { MarkdownView, Plugin, WorkspaceLeaf, } from 'obsidian';
import { DEFAULT_SETTINGS, TaskManagerSettings, TaskManagerSettingTab, } from './settings';
import { TaskManagerView, VIEW_TYPE_TASK_MANAGER } from "./views/TaskManagerView";
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

        const syncAllMarkdownLeaves = () => {
            for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
                const view = leaf.view;

                if (view instanceof MarkdownView) {
                    void this.inlineView.sync(view);
                }
            }
        };

        this.registerEvent(
            this.app.workspace.on("layout-change", syncAllMarkdownLeaves)
        );

        this.registerEvent(
            this.app.workspace.on("active-leaf-change", syncAllMarkdownLeaves)
        );

        this.registerEvent(
            this.app.vault.on("modify", syncAllMarkdownLeaves)
        );

        this.registerEvent(
            this.app.vault.on("rename", syncAllMarkdownLeaves)
        );

        this.registerEvent(
            this.app.vault.on("create", syncAllMarkdownLeaves)
        );

        this.registerEvent(
            this.app.vault.on("delete", syncAllMarkdownLeaves)
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
