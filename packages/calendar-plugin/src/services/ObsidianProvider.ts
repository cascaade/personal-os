import { App, EventRef, parseLinktext, TFile, WorkspaceItem, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_CALENDAR } from "@/views/CalendarView";
import CalendarPlugin from "@/main";

export class ObsidianProvider {
    constructor(private app: App, private plugin: CalendarPlugin) {}

    // todo: get rid of for OOP
    public getApp(): App {
        return this.app;
    }

    public registerEvent(eventRef: EventRef) {
        this.plugin.registerEvent(eventRef);
    }

    public resolveLink(link: unknown, source: TFile): TFile | undefined {
        if (typeof link !== "string") return undefined;

        const cleaned = link
            .replace(/^\[\[/, "")
            .replace(/\]\]$/, "");

        const parsed = parseLinktext(cleaned);
        const file = this.app.metadataCache.getFirstLinkpathDest(parsed.path, source.path);

        return (
            file ??
            undefined
        );
    }

    public getFrontmatter(file: TFile) {
        return this.app.metadataCache.getFileCache(file)?.frontmatter;
    }

    public isInTemplatesFolder(file: TFile): boolean {
        return file.path.split("/").includes("Templates");
    }

    public getMarkdownFiles(): TFile[] {
        return this.app.vault.getMarkdownFiles();
    }

    private detailLeaf: WorkspaceLeaf | null = null;
    private detailLeafParent: WorkspaceItem | null = null;

    async openInRightPane(file: TFile) {
        const calendarLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
        if (!calendarLeaf) return;

        const rightLeaf = this.getOrCreateDetailLeaf(calendarLeaf);
        await rightLeaf.openFile(file);
    }

    private getOrCreateDetailLeaf(calendarLeaf: WorkspaceLeaf): WorkspaceLeaf {
        if (
            this.detailLeaf &&
            this.isLeafOpen(this.detailLeaf) &&
            this.detailLeaf.parent === this.detailLeafParent
        ) {
            return this.detailLeaf;
        }

        // Stale, closed, or moved to a different frame — make a fresh split
        const newLeaf = this.app.workspace.createLeafBySplit(calendarLeaf, "vertical");
        this.detailLeaf = newLeaf;
        this.detailLeafParent = newLeaf.parent;

        // obsidian api doesn't declare containerEl as a public property
        (this.detailLeafParent as unknown as { containerEl: HTMLElement }).containerEl.addClass("calendar-plugin-side-leaf");
        return newLeaf;
    }

    private isLeafOpen(leaf: WorkspaceLeaf): boolean {
        let found = false;
        this.app.workspace.iterateAllLeaves((l) => {
            if (l === leaf) found = true;
        });
        return found;
    }

    public async openNoteToRight(path: string) {
        const file = this.app.vault.getAbstractFileByPath(path);

        if (!(file instanceof TFile)) return;

        await this.openInRightPane(file);
    };

    public onunload() {
        this.detailLeaf = null;
        this.detailLeafParent = null;
    }
}
