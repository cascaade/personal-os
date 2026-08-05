import { TFile } from "obsidian";
import { formatDate, parseLocalDate, toLocalISOString } from "@/util/date-utils";
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

const MAX_LOOSE_FILES = 10;

export class CommitmentsProvider {
    private cache: Map<string, Commitment> | null = null;
    private commitmentsByDayCache: Map<string, Commitment[]> = new Map();

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

    //TODO: CACHE ASSUMES THINGS DONT CHANGE!! MUST FIX!!
    public async getCommitments(date: Date): Promise<Commitment[]> {
        const cacheKey = date.toDateString();

        const cached = this.commitmentsByDayCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const commitments = (await this.getAllCommitments())
            .filter(c => c.due?.toDateString() == cacheKey);

        this.commitmentsByDayCache.set(cacheKey, commitments);

        return commitments;
    }

    public async createNewCommitment() {
        const template = this.ctx.obsidian.getApp().vault.getFileByPath(this.ctx.settings.commitmentTemplateLocation);

        const contents = template
            ? await this.ctx.obsidian.getApp().vault.cachedRead(template)
            : "";

        const path = this.ctx.settings.newCommitmentDefaultFolder + "Untitled commitment";
        const ext = ".md";

        let preExist = this.ctx.obsidian.getApp().vault.getAbstractFileByPath(path + ext);
        let i = 0;

        while (preExist instanceof TFile && i < MAX_LOOSE_FILES) {
            i++;
            preExist = this.ctx.obsidian.getApp().vault.getAbstractFileByPath(path + " " + i + ext);
        }

        const file = await this.ctx.obsidian.getApp().vault.create(
            path + (i === 0 ? "" : " " + i) + ext,
            contents
        );

        return file;
    }

    public async processNewCommitmentFrontmatter(file: TFile, fm: CommitmentFrontmatter) {
        await this.ctx.obsidian.getApp().fileManager.processFrontMatter(file, (frontmatter: CommitmentFrontmatter) => {
            frontmatter.type = fm.type ?? frontmatter.type;
            frontmatter.role = fm.role ?? frontmatter.role;

            frontmatter.assigned = fm.assigned ?? toLocalISOString(new Date()) ?? frontmatter.assigned;
            frontmatter.status = fm.status ?? frontmatter.status;

            frontmatter.start = fm.start ?? frontmatter.start;
            frontmatter.due = fm.due ?? frontmatter.due;

            frontmatter.class = fm.class ?? frontmatter.class;
            frontmatter.project = fm.project ?? frontmatter.project;

            frontmatter.actual_effort = fm.actual_effort ?? frontmatter.actual_effort;
        });
    }
}
