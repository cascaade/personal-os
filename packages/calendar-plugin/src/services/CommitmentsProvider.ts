import { Notice, TFile } from "obsidian";
import { formatDate, getDayGap, parseLocalDate, toLocalISOString } from "@/util/date-utils";
import { CalendarContext } from "@/services/CalendarContext";
import { ConfirmModal } from "@/obsidian/ConfirmModal";

type CommitmentFrontmatter = {
    type?: string;
    role?: string;

    assigned?: string;
    status?: string;

    start?: string;
    due?: string;

    class?: string;
    project?: string;

    duplicate_of?: string;

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

    classPath?: string;
    projectPath?: string;

    duplicatePath?: string;

    actual_effort?: number;
}

export interface LastDuplicate {
    commitment: Commitment;
    dayGap: number;
}

const MAX_LOOSE_FILES = 10;

export class CommitmentsProvider {
    private cache = new Map<TFile, Commitment>();
    private cacheByPath = new Map<string, Commitment>();
    private commitmentsByDay = new Map<string, Commitment[]>();

    private duplicateWeb = new Map<string, Set<string>>();
    private synchronizing = new Set<string>();

    private readonly EMPTY_COMMITMENTS: readonly Commitment[] = [];

    private listenersByDay = new Map<string, Set<() => void>>();
    private pending = new Map<string, number>();

    private lastDuplicate: LastDuplicate | null = null;

    constructor(private ctx: CalendarContext) {
        this.cache = new Map();

        for (const file of this.ctx.obsidian.getMarkdownFiles()) {
            if (this.ctx.obsidian.isInTemplatesFolder(file)) continue;

            this.reparse(file, false).catch(console.error);
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
            this.ctx.obsidian.getApp().vault.on("rename", (file, oldPath) => {
                if (file instanceof TFile)
                    this.invalidate(file, oldPath);
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
            classPath: fm.class,
            projectPath: fm.project,
            duplicatePath: fm.duplicate_of,
            actual_effort: fm.actual_effort != null ? Number(fm.actual_effort) : undefined,
        };
    }

    private async reparse(file: TFile, notify: boolean | undefined = true, oldPath?: string) {
        const parsed = this.parseCommitment(file);

        if (!parsed) {
            this.remove(file);
            return;
        }

        const existing = this.cache.get(file);

        if (existing) {
            if (oldPath) {
                this.cacheByPath.delete(oldPath);
            }

            this.cache.set(file, parsed);
            this.cacheByPath.set(file.path, parsed);
            this.rebuildDuplicateMembership(parsed, oldPath);

            await this.updateDayMembership(existing, parsed, !!notify);
        } else {
            this.cache.set(file, parsed);
            this.cacheByPath.set(file.path, parsed);
            this.rebuildDuplicateMembership(parsed, oldPath);

            await this.addDayMembership(parsed, !!notify);
        }

        if (!this.synchronizing.has(file.path)) {
            await this.synchronizeDuplicateWeb(parsed);
        }
    }

    private async updateDayMembership(
        oldCommitment: Commitment,
        newCommitment: Commitment,
        notify: boolean,
    ) {
        const oldKey = oldCommitment.due
            ? formatDate(oldCommitment.due)
            : undefined;

        const newKey = newCommitment.due
            ? formatDate(newCommitment.due)
            : undefined;

        // Same day: replace the object in-place.
        if (oldKey === newKey) {
            if (newKey) {
                const commitments = this.commitmentsByDay.get(newKey);

                if (commitments) {
                    this.commitmentsByDay.set(
                        newKey,
                        commitments.map(c =>
                            c === oldCommitment
                                ? newCommitment
                                : c
                        )
                    );
                }

                if (notify) {
                    this.notifyDay(newKey);
                }
            }

            return;
        }

        // Remove from old day FIRST.
        if (oldKey) {
            const commitments =
                this.commitmentsByDay.get(oldKey);

            if (commitments) {
                const next = commitments.filter(
                    c => c !== oldCommitment
                );

                if (next.length === 0) {
                    this.commitmentsByDay.delete(oldKey);
                } else {
                    this.commitmentsByDay.set(oldKey, next);
                }
            }

            if (notify) {
                this.notifyDay(oldKey);
            }
        }

        // Now check for duplicate collision.
        if (newKey) {
            const deleted =
                await this.handleDuplicateCollision(
                    newCommitment
                );

            // The commitment being moved was deleted.
            if (deleted) {
                return;
            }
        }

        // Add to new day.
        if (newKey) {
            const commitments =
                this.commitmentsByDay.get(newKey) ??
                this.EMPTY_COMMITMENTS;

            this.commitmentsByDay.set(newKey, [
                ...commitments,
                newCommitment,
            ]);

            if (notify) {
                this.notifyDay(newKey);
            }
        }
    }

    private async addDayMembership(commitment: Commitment, notify: boolean) {
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

        if (notify)
            this.notifyDay(key);
    }

    private async synchronizeDuplicateWeb(commitment: Commitment) {
        const originalPath = this.getOriginalPath(commitment);

        if (!originalPath) return;

        const duplicatePaths =
            this.duplicateWeb.get(originalPath) ?? new Set();

        const allPaths = new Set([
            originalPath,
            ...duplicatePaths,
        ]);

        // Don't synchronize if we're already doing so.
        if (
            [ ...allPaths ].some(path =>
                this.synchronizing.has(path)
            )
        ) {
            return;
        }

        for (const path of allPaths) {
            this.synchronizing.add(path);
        }

        try {
            for (const path of allPaths) {
                if (path === commitment.file.path) continue;

                const other = this.cacheByPath.get(path);

                if (!other) continue;

                const startDate = other.start ? new Date(other.start) : undefined;

                if (startDate && commitment.start)
                    startDate.setHours(
                        commitment.start.getHours(),
                        commitment.start.getMinutes(),
                        commitment.start.getSeconds(),
                        commitment.start.getMilliseconds()
                    );

                await this.modifyCommitmentFrontmatter(
                        other.file,
                        {
                            type: commitment.type,
                            role: commitment.role,

                            status: commitment.status,

                            start: startDate
                                ? toLocalISOString(startDate)
                                : undefined,

                            class: commitment.classPath,
                            project: commitment.projectPath,

                            actual_effort: commitment.actual_effort,
                        }
                    );
            }
        } finally {
            for (const path of allPaths) {
                this.synchronizing.delete(path);
            }
        }
    }

    private getOriginalPath(commitment: Commitment): string | undefined {
        if (!commitment.duplicatePath) {
            return commitment.file.path;
        }

        const originalFile = this.ctx.obsidian.resolveLink(
            commitment.duplicatePath,
            commitment.file
        );

        return originalFile instanceof TFile
            ? originalFile.path
            : undefined;
    }

    private rebuildDuplicateMembership(
        commitment: Commitment,
        oldPath?: string,
    ) {
        for (const [ originalPath, duplicates ] of this.duplicateWeb) {
            if (oldPath) {
                duplicates.delete(oldPath);
            }

            duplicates.delete(commitment.file.path);

            if (duplicates.size === 0) {
                this.duplicateWeb.delete(originalPath);
            }
        }

        if (!commitment.duplicatePath) return;

        const originalFile = this.ctx.obsidian.resolveLink(
            commitment.duplicatePath,
            commitment.file
        );

        if (!( originalFile instanceof TFile )) return;

        let duplicates =
            this.duplicateWeb.get(originalFile.path);

        if (!duplicates) {
            duplicates = new Set();
            this.duplicateWeb.set(
                originalFile.path,
                duplicates
            );
        }

        duplicates.add(commitment.file.path);
    }

    private async handleDuplicateCollision(
        commitment: Commitment,
    ): Promise<boolean> {
        if (!commitment.due) return false;

        const originalPath = this.getOriginalPath(commitment);

        if (!originalPath) return false;

        const dayKey = formatDate(commitment.due);

        const original = this.cacheByPath.get(originalPath);

        // Find any OTHER member of this duplicate family
        // that is already on this day.
        let collision: Commitment | undefined;

        if (
            original &&
            original.file.path !== commitment.file.path &&
            original.due &&
            formatDate(original.due) === dayKey
        ) {
            collision = original;
        }

        if (!collision) {
            const duplicatePaths =
                this.duplicateWeb.get(originalPath);

            if (duplicatePaths) {
                for (const path of duplicatePaths) {
                    const duplicate = this.cacheByPath.get(path);

                    if (
                        duplicate &&
                        duplicate.file.path !== commitment.file.path &&
                        duplicate.due &&
                        formatDate(duplicate.due) === dayKey
                    ) {
                        collision = duplicate;
                        break;
                    }
                }
            }
        }

        if (!collision) return false;

        const fileToDelete =
            commitment.file.path === originalPath
                ? collision.file
                : commitment.file;

        await this.ctx.obsidian
            .getApp()
            .fileManager
            .trashFile(fileToDelete);

        new Notice("Deleted event collision");

        // Return whether the commitment being moved was deleted.
        return fileToDelete === commitment.file;
    }

    public async getAllCommitments(): Promise<Commitment[]> {
        return [ ...this.cache.values() ];
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
        if (!commitment.classPath) return;

        return this.ctx.classes.getClass(commitment.classPath, commitment.file);
    }

    getProject(commitment: Commitment): Commitment | undefined {
        if (!commitment.projectPath) return;

        const file = this.ctx.obsidian.resolveLink(
            commitment.projectPath,
            commitment.file
        );

        if (!( file instanceof TFile )) return;

        return this.cacheByPath.get(file.path);
    }

    getDuplicate(commitment: Commitment): Commitment | undefined {
        if (!commitment.duplicatePath) return;

        const file = this.ctx.obsidian.resolveLink(
            commitment.duplicatePath,
            commitment.file
        );

        if (!( file instanceof TFile )) return;

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
            path + ( i === 0 ? "" : " " + i ) + ext,
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

            frontmatter.duplicate_of = fm.duplicate_of ?? frontmatter.duplicate_of;

            frontmatter.actual_effort = fm.actual_effort ?? frontmatter.actual_effort;
        });
    }

    subscribe(key: string, listener: () => void) {
        let listeners = this.listenersByDay.get(key);

        if (!listeners) {
            listeners = new Set();
            this.listenersByDay.set(key, listeners);
        }

        listeners.add(listener);

        return () => {
            listeners.delete(listener);

            if (listeners.size === 0) {
                this.listenersByDay.delete(key);
            }
        };
    }

    private notifyDay(key: string) {
        const listeners = this.listenersByDay.get(key);

        if (!listeners) return;

        for (const listener of listeners) {
            listener();
        }
    }

    invalidate(file: TFile, oldPath?: string) {
        clearTimeout(this.pending.get(file.path));

        this.pending.set(file.path,
            window.setTimeout(() => {
                this.reparse(file, true, oldPath).catch(console.error);
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

        if (commitment.due) {
            this.notifyDay(formatDate(commitment.due));
        }

        for (const [ originalPath, duplicates ] of this.duplicateWeb) {
            duplicates.delete(file.path);

            if (duplicates.size === 0) {
                this.duplicateWeb.delete(originalPath);
            }
        }

        this.duplicateWeb.delete(file.path);
    }

    public clearAllCommitments(day: Date) {
        new ConfirmModal(
            this.ctx.obsidian.getApp(),
            `Delete all commitments on ${ day.toDateString() }? This cannot be undone.`,
            () => {
                const commitments = this.getCommitments(day);
                commitments.forEach((commitment) => {
                        this.ctx.obsidian.getApp().fileManager.trashFile(commitment.file).catch(console.error)
                    }
                )
            }
        ).open();
    }

    private hasDuplicateOnDay(
        commitment: Commitment,
        day: Date,
    ): boolean {
        const originalPath = this.getOriginalPath(commitment);

        if (!originalPath) return false;

        const dayKey = formatDate(day);

        // Check the original.
        const original = this.cacheByPath.get(originalPath);

        if (
            original &&
            original.file.path !== commitment.file.path &&
            original.due &&
            formatDate(original.due) === dayKey
        ) {
            return true;
        }

        // Check all duplicates.
        const duplicatePaths =
            this.duplicateWeb.get(originalPath);

        if (!duplicatePaths) return false;

        for (const path of duplicatePaths) {
            const duplicate = this.cacheByPath.get(path);

            if (
                duplicate &&
                duplicate.file.path !== commitment.file.path &&
                duplicate.due &&
                formatDate(duplicate.due) === dayKey
            ) {
                return true;
            }
        }

        return false;
    }

    public async duplicateCommitment(commitment: Commitment, date?: Date): Promise<TFile | undefined> {
        const vault = this.ctx.obsidian.getApp().vault;

        const original = this.getDuplicate(commitment) ?? commitment;

        const originalFile = original.file;

        if (!original) {
            new Notice("Error in duplication");
            throw new Error(
                `Could not find commitment in cache: ${ originalFile.path }`
            );
        }

        if (original.role == "project") {
            new Notice("Cannot duplicate a project");
            return;
        }

        let due = commitment.due
            ? new Date(commitment.due)
            : undefined;

        if (due) {
            due.setDate(due.getDate() + 1);

            if (this.hasDuplicateOnDay(commitment, due)) {
                new Notice("A duplicate already exists on that day");
                return;
            }
        }

        if (date) {
            due = date;
        }

        const contents = await vault.cachedRead(originalFile);

        const folder = ( originalFile.parent?.path ?? "" ) + "/";
        const name = originalFile.basename;

        const path = folder + name + " duplicate";
        const ext = ".md";

        let preExist =
            vault.getAbstractFileByPath(path + ext);

        let i = 0;

        while (preExist instanceof TFile) {
            i++;

            preExist = vault.getAbstractFileByPath(
                path + " " + i + ext
            );
        }

        const file = await vault.create(
            path + ( i === 0 ? "" : " " + i ) + ext,
            contents
        );

        await this.modifyCommitmentFrontmatter(file, {
            duplicate_of: `[[${ originalFile.path }|${ originalFile.basename }]]`,
            due: due ? formatDate(due) : undefined,
        });

        return file;
    }

    getCommitment(file: TFile) {
        return this.cacheByPath.get(file.path);
    }

    setLastDuplicate(dupe: LastDuplicate) {
        this.lastDuplicate = dupe;
    }

    async duplicateLastCommitment() {
        if (!this.lastDuplicate) {
            new Notice("Couldn't find previous duplicate");
            return;
        }

        const { commitment, dayGap } = this.lastDuplicate;

        if (!commitment.due) {
            new Notice("No due date on previous commitment");
            return;
        }

        const newDate = new Date(commitment.due);
        newDate.setDate(newDate.getDate() + dayGap);

        const duplicate = await this.duplicateCommitment(commitment, newDate);

        if (!duplicate) return;

        await new Promise(resolve => setTimeout(resolve, 200));

        let c = this.getCommitment(duplicate);

        if (!c) {
            new Notice("Error duplicating");
            return;
        }

        this.lastDuplicate = {
            commitment: c,
            dayGap,
        };
    }
}
