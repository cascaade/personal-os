import { App, MarkdownView } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createContext } from "react";

import TaskManagerInlineView from "@/components/TaskManagerInlineView";
import { TaskManagerSettings } from "@/settings";
import TaskManagerPlugin from "@/main";
import PersonalOSContext from "@personal-os/obsidian/dist/services/PersonalOSContext";
import { VIEW_TYPE_TASK_MANAGER } from "@/views/TaskManagerView";

export type ObsidianContextProps = {
    readonly app: App;
    readonly ctx: PersonalOSContext;
    readonly settings: TaskManagerSettings;
}

export const InlineObsidianContext = createContext<ObsidianContextProps | null>(null);

export class InlineTaskManagerView {
    private roots = new Map<MarkdownView, Root>();
    private ctx!: PersonalOSContext;

    constructor(
        private plugin: TaskManagerPlugin,
        private settings: TaskManagerSettings
    ) {
        this.ctx = new PersonalOSContext(this.plugin, this.settings, VIEW_TYPE_TASK_MANAGER);
    }

    /** Call this on active-leaf-change / file-open / metadata-changed */
    async sync(view: MarkdownView | null) {
        if (!view) return;

        const shouldShow = this.shouldShowFor(view);
        const alreadyMounted = this.roots.has(view);

        if (alreadyMounted) {
            this.unmount(view);
        }

        if (shouldShow) {
            this.mount(view);
        }
    }

    /** Call this when a leaf/view is closed to avoid leaking React roots */
    unmount(view: MarkdownView) {
        const root = this.roots.get(view);
        if (!root) return;

        root.unmount();
        this.roots.delete(view);

        view.contentEl.querySelector(".task-manager-inline-view")?.remove();
    }

    unmountAll() {
        this.roots.forEach((root) => root.unmount());
        this.roots.clear();
    }

    private shouldShowFor(view: MarkdownView): boolean {
        const file = view.file;
        if (!file || this.ctx.obsidian.isInTemplatesFolder(file)) return false;

        const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
        return frontmatter?.type === "daily";
    }

    private mount(view: MarkdownView) {
        const container = view.contentEl.querySelector(".metadata-container");
        if (!container) return;

        const mountPoint = document.createElement("div");
        mountPoint.addClass("task-manager-inline-view");
        container.insertAdjacentElement("afterend", mountPoint);

        const file = view.file;
        if (!file) return;

        const date = this.ctx.dailies.getDailyByFile(file)?.date;
        if (!date) return;

        const root = createRoot(mountPoint);
        root.render(
            <InlineObsidianContext.Provider
                value={{ app: this.plugin.app, ctx: this.ctx, settings: this.settings }}>
                <TaskManagerInlineView date={date}/>
            </InlineObsidianContext.Provider>,
        );

        this.roots.set(view, root);
    }
}
