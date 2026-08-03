import { App, parseLinktext, TFile } from "obsidian";
import { Class, Commitment } from "@/util/commitment-utils";
import { parseLocalDate } from "@/util/date-utils";

interface CommitmentFrontmatter {
    type?: string;
    role?: string;
    assigned?: string;
    status?: string;
    start?: string;
    due?: string;
    class?: string;
    project?: string;
    actual_effort?: number;
}

interface ClassFrontmatter {
    type?: string;
    role?: string;
}

export class CommitmentProvider {
    constructor(private app: App) {}

    private resolveLink(link: unknown, source: TFile): TFile | undefined {
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

    private getFrontmatter(file: TFile) {
        return this.app.metadataCache.getFileCache(file)?.frontmatter;
    }

    private isInTemplatesFolder(file: TFile): boolean {
        return file.path.split("/").includes("Templates");
    }

    private parseClass(file: TFile | undefined): Class | null {
        if (!file) return null;

        const fm = this.getFrontmatter(file) as ClassFrontmatter;
        if (fm?.type !== "entity" || fm?.role !== "class") return null;

        return {
            file: file
        }
    }

    private parseProject(file: TFile | undefined, originCommitments: TFile[]): Commitment | null {
        if (!file) return null;

        if (originCommitments.contains(file)) return null; // prevent circular loops

        const fm = this.getFrontmatter(file) as CommitmentFrontmatter;
        if (fm?.type !== "commitment" || fm?.role !== "project") return null;

        return this.parseCommitment(file, originCommitments);
    }

    private parseCommitment(file: TFile, originCommitments: TFile[]): Commitment | null {
        const fm = this.getFrontmatter(file) as CommitmentFrontmatter;
        if (fm?.type !== "commitment") return null;

        return {
            file,
            title: file.basename,
            role: fm.role,
            assigned: fm.assigned ? new Date(fm.assigned) : undefined,
            status: fm.status,
            start: fm.start ? parseLocalDate(fm.start) : undefined,
            due: fm.due ? parseLocalDate(fm.due) : undefined,
            class: this.parseClass(this.resolveLink(fm.class, file)) ?? undefined,
            project: this.parseProject(this.resolveLink(fm.project, file), [file, ...originCommitments]) ?? undefined,
            actual_effort: fm.actual_effort != null ? Number(fm.actual_effort) : undefined,
        };
    }

    async getAllCommitments(): Promise<Commitment[]> {
        return this.app.vault
            .getMarkdownFiles()
            .filter(file => !this.isInTemplatesFolder(file))
            .map(file => this.parseCommitment(file, []))
            .filter((c): c is Commitment => c !== null);
    }
}
