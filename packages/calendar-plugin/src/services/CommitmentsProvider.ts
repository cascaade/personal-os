import { App, parseLinktext, TFile } from "obsidian";
import { parseLocalDate } from "@/util/date-utils";
import { ObsidianProvider } from "@/services/ObsidianProvider";
import { CalendarContext } from "@/services/CalendarContext";
import { Class } from "@/services/ClassProvider";

type CommitmentFrontmatter = {
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

export type Commitment = {
    type: "commitment";
    role?: string;

    file: TFile;
    title: string;

    assigned?: Date;
    status?: string;

    start?: Date;
    due?: Date;

    class?: Class;
    project?: Commitment;

    actual_effort?: number;
}

export class CommitmentsProvider {
    private cache: Map<string, Commitment> | null = null;

    constructor(private ctx: CalendarContext) {}

    public parseProject(file: TFile | undefined, originCommitments: TFile[]): Commitment | null {
        if (!file) return null;

        if (originCommitments.contains(file)) return null; // prevent circular loops

        const fm = this.ctx.obsidian.getFrontmatter(file) as CommitmentFrontmatter;
        if (fm?.type !== "commitment" || fm?.role !== "project") return null;

        return this.parseCommitment(file, originCommitments);
    }

    public parseCommitment(file: TFile, originCommitments: TFile[]): Commitment | null {
        const fm = this.ctx.obsidian.getFrontmatter(file) as CommitmentFrontmatter;
        if (fm?.type !== "commitment") return null;

        return {
            type: "commitment",
            file,
            title: file.basename,
            role: fm.role,
            assigned: fm.assigned ? new Date(fm.assigned) : undefined,
            status: fm.status,
            start: fm.start ? parseLocalDate(fm.start) : undefined,
            due: fm.due ? parseLocalDate(fm.due) : undefined,
            class: this.ctx.classes.parseClass(this.ctx.obsidian.resolveLink(fm.class, file)) ?? undefined,
            project: this.parseProject(this.ctx.obsidian.resolveLink(fm.project, file), [file, ...originCommitments]) ?? undefined,
            actual_effort: fm.actual_effort != null ? Number(fm.actual_effort) : undefined,
        };
    }

    private async buildCache() {
        this.cache = new Map();

        for (const file of this.ctx.obsidian.getMarkdownFiles()) {
            if (this.ctx.obsidian.isInTemplatesFolder(file)) continue;

            const commitment = this.parseCommitment(file, []);
            if (commitment) {
                this.cache.set(file.path, commitment);
            }
        }
    }

    public async getCommitment(path: string): Promise<Commitment | null> {
        if (this.cache === null) {
            await this.buildCache();
        }

        return this.cache!.get(path) ?? null;
    }

    public async getAllCommitments(): Promise<Commitment[]> {
        if (this.cache === null) {
            await this.buildCache();
        }

        return [...this.cache!.values()];
    }
}
