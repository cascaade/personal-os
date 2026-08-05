import { TFile } from "obsidian";
import { formatDate, parseLocalDate } from "@/util/date-utils";
import { CalendarContext } from "@/services/CalendarContext";

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

    classFile?: string;
    projectFile?: string;

    actual_effort?: number;
}

const MAX_LOOSE_FILES = 10;

export class CommitmentsProvider {
    private cache = new Map<TFile, Commitment>();
    private cacheByPath = new Map<string, Commitment>();
    private commitmentsByDay = new Map<string, Commitment[]>();

    private readonly EMPTY_COMMITMENTS: readonly Commitment[] = [];

    private listeners = new Set<() => void>();
    private pending = new Map<string, number>();

    constructor(private ctx: CalendarContext) {
        this.cache = new Map();

        for (const file of this.ctx.obsidian.getMarkdownFiles()) {
            if (this.ctx.obsidian.isInTemplatesFolder(file)) continue;

            this.reparse(file, false);

            console.log("e")
        }

        this.ctx.obsidian.registerEvent(
            this.ctx.obsidian.getApp().vault.on("modify", file => {
                if (file instanceof TFile)
                    this.invalidate(file);
            })
        );

        this.ctx.obsidian.registerEvent(
            this.ctx.obsidian.getApp().vault.on("create", file => {
                if (file instanceof TFile)
                    this.invalidate(file);
            })
        );

        this.ctx.obsidian.registerEvent(
            this.ctx.obsidian.getApp().vault.on("delete", file => {
                if (file instanceof TFile)
                    this.remove(file);
            })
        );

        this.ctx.obsidian.registerEvent(
            this.ctx.obsidian.getApp().vault.on("rename", file => {
                if (file instanceof TFile)
                    this.invalidate(file);
            })
        );
    }

    // public parseProject(file: TFile | undefined): Commitment | null {
    //     if (!file) return null;
    //
    //     const fm = this.ctx.obsidian.getFrontmatter(file) as CommitmentFrontmatter;
    //     if (fm?.type !== "commitment" || fm?.role !== "project") return null;
    //
    //     return this.parseCommitment(file);
    // }
    //

    public parseCommitment(file: TFile): Commitment | null {
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
            classFile: fm.class,
            projectFile: fm.project,
            actual_effort: fm.actual_effort != null ? Number(fm.actual_effort) : undefined,
        };
    }

    private reparse(file: TFile, notify: boolean | undefined = true) {
        const parsed = this.parseCommitment(file);

        if (!parsed) {
            this.remove(file);
            return;
        }

        const existing = this.cache.get(file);

        if (existing) {
            const oldDue = existing.due;

            Object.assign(existing, parsed);
            this.cacheByPath.set(file.path, existing);

            this.updateDayMembership(existing, oldDue);
        } else {
            this.cache.set(file, parsed);
            this.cacheByPath.set(file.path, parsed);
            this.addDayMembership(parsed);
        }

        if (notify) {
            this.notify();
        }
    }

    private updateDayMembership(
        commitment: Commitment,
        oldDue: Date | undefined
    ) {
        const oldKey = oldDue ? formatDate(oldDue) : undefined;
        const newKey = commitment.due ? formatDate(commitment.due) : undefined;

        if (oldKey === newKey) return;

        if (oldKey) {
            const oldCommitments = this.commitmentsByDay.get(oldKey);

            if (oldCommitments) {
                const next = oldCommitments.filter(c => c !== commitment);

                if (next.length === 0) {
                    this.commitmentsByDay.delete(oldKey);
                } else {
                    this.commitmentsByDay.set(oldKey, next);
                }
            }
        }

        if (newKey) {
            const oldCommitments =
                this.commitmentsByDay.get(newKey) ?? this.EMPTY_COMMITMENTS;

            if (!oldCommitments.includes(commitment)) {
                this.commitmentsByDay.set(newKey, [
                    ...oldCommitments,
                    commitment,
                ]);
            }
        }
    }

    private addDayMembership(commitment: Commitment) {
        if (!commitment.due) return;

        const key = formatDate(commitment.due);

        const commitments =
            this.commitmentsByDay.get(key) ?? this.EMPTY_COMMITMENTS;

        if (!commitments.includes(commitment)) {
            this.commitmentsByDay.set(key, [
                ...commitments,
                commitment,
            ]);
        }
    }

    public async getAllCommitments(): Promise<Commitment[]> {
        return [...this.cache.values()];
    }

    getCommitments(date: Date): readonly Commitment[] {
        return (
            this.commitmentsByDay.get(formatDate(date)) ??
            this.EMPTY_COMMITMENTS
        );
    }

    // public getCommitment(path: string): Promise<Commitment | null> {
    //     return this.cache.get(path) ?? null;
    // }

    getClass(commitment: Commitment) {
        if (!commitment.classFile) return;

        return this.ctx.classes.getClass(commitment.classFile, commitment.file);
    }

    getProject(commitment: Commitment): Commitment | undefined {
        if (!commitment.projectFile) return;

        const file = this.ctx.obsidian.resolveLink(
            commitment.projectFile,
            commitment.file
        );

        if (!(file instanceof TFile)) return;

        return this.cacheByPath.get(file.path);
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

    public async modifyCommitmentFrontmatter(file: TFile, fm: CommitmentFrontmatter) {
        await this.ctx.obsidian.getApp().fileManager.processFrontMatter(file, (frontmatter: CommitmentFrontmatter) => {
            frontmatter.type = fm.type ?? frontmatter.type;
            frontmatter.role = fm.role ?? frontmatter.role;

            frontmatter.assigned = fm.assigned ?? frontmatter.assigned;
            frontmatter.status = fm.status ?? frontmatter.status;

            frontmatter.start = fm.start ?? frontmatter.start;
            frontmatter.due = fm.due ?? frontmatter.due;

            frontmatter.class = fm.class ?? frontmatter.class;
            frontmatter.project = fm.project ?? frontmatter.project;

            frontmatter.actual_effort = fm.actual_effort ?? frontmatter.actual_effort;
        });
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        for (const listener of this.listeners)
            listener();

        console.log("notifying a lot!!");
    }

    invalidate(file: TFile) {
        clearTimeout(this.pending.get(file.path));

        this.pending.set(file.path,
            window.setTimeout(() => {
                this.reparse(file);
                this.pending.delete(file.path);
            }, 100)
        );
    }

    private remove(file: TFile) {
        const commitment = this.cache.get(file);
        if (!commitment) return;

        if (commitment.due) {
            const key = formatDate(commitment.due);

            const commitments = this.commitmentsByDay.get(key);

            if (commitments) {
                const next = commitments.filter(c => c !== commitment);

                if (next.length === 0) {
                    this.commitmentsByDay.delete(key);
                } else {
                    this.commitmentsByDay.set(key, next);
                }
            }
        }

        this.cache.delete(file);
        this.cacheByPath.delete(file.path);

        this.notify();
    }
}
