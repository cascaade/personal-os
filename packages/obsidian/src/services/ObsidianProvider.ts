import { App, EventRef, parseLinktext, Plugin, TFile, WorkspaceLeaf } from "obsidian";

const DETAIL_LEAF_MARKER_CLASS = "cascaades-detail-leaf";

export class ObsidianProvider {
    constructor(private app: App, private plugin: Plugin) {}

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
            .replace(/\]\]$/, "")
            .split("|")[0] ?? "";

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

    async openInRightPane(file: TFile, sourceLeaf: WorkspaceLeaf) {
        const rightLeaf = this.getOrCreateDetailLeaf(sourceLeaf);
        await rightLeaf.openFile(file);
    }

    private getOrCreateDetailLeaf(sourceLeaf: WorkspaceLeaf): WorkspaceLeaf {
        // Look for a split any plugin has already marked as the shared detail pane —
        // not just the one *this* provider instance happened to create.
        const existing = this.findMarkedDetailLeaf();
        if (existing) return existing;

        const newLeaf = this.app.workspace.createLeafBySplit(sourceLeaf, "vertical");

        // obsidian api doesn't declare containerEl as a public property
        const parentEl = (newLeaf.parent as unknown as { containerEl: HTMLElement }).containerEl;
        parentEl.addClass(DETAIL_LEAF_MARKER_CLASS);

        return newLeaf;
    }

    private findMarkedDetailLeaf(): WorkspaceLeaf | undefined {
        let found: WorkspaceLeaf | undefined;

        this.app.workspace.iterateAllLeaves((leaf) => {
            if (found) return;

            const parentEl = (leaf.parent as unknown as { containerEl?: HTMLElement })?.containerEl;
            if (parentEl?.hasClass(DETAIL_LEAF_MARKER_CLASS)) {
                found = leaf;
            }
        });

        return found;
    }

    public async openNoteToRight(path: string, sourceLeaf: WorkspaceLeaf) {
        const file = this.app.vault.getAbstractFileByPath(path);

        if (!(file instanceof TFile)) return;

        await this.openInRightPane(file, sourceLeaf);
    };

    public onunload() {

    }
}
