import { App, parseLinktext, TFile } from "obsidian";
import { Class } from "@/services/ClassProvider";

export class ObsidianProvider {
    constructor(private app: App) {}

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
}
