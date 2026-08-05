import { TFile } from "obsidian";
import { CalendarContext } from "@/services/CalendarContext";
import { formatDate, parseLocalDate } from "@/util/date-utils";

type DailyNoteFrontmatter = {
    type?: string;
    role?: string;

    date?: string;
}

export type DailyNote = {
    type: "daily";
    file: TFile;
    title: string;

    date?: Date;
}

export class DailyNoteProvider {
    private cache = new Map<TFile, DailyNote>();
    private notesByDay = new Map<string, DailyNote>();

    private listeners = new Set<() => void>();
    private pending = new Map<string, number>();

    constructor(private ctx: CalendarContext) {
        for (const file of this.ctx.obsidian.getMarkdownFiles()) {
            if (this.ctx.obsidian.isInTemplatesFolder(file)) continue;

            this.reparse(file, false);
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

    public parseDaily(file: TFile) {
        if (!file) return null;

        const fm = this.ctx.obsidian.getFrontmatter(file) as DailyNoteFrontmatter;
        if (fm?.type !== "daily") return null;

        return {
            type: "daily",
            file: file,
            date: fm.date ? parseLocalDate(fm.date) : undefined,
        } as DailyNote;
    }

    private reparse(file: TFile, notify: boolean | undefined = true) {
        const parsed = this.parseDaily(file);

        if (!parsed) {
            this.remove(file);
            return;
        }

        const existing = this.cache.get(file);

        if (existing) {
            const oldDate = existing.date;

            this.cache.set(file, parsed);

            this.updateDateMembership(existing, oldDate ?? null);
        } else {
            this.cache.set(file, parsed);
            this.addDateMembership(parsed);
        }

        if (notify) {
            this.notify();
        }
    }

    private addDateMembership(daily: DailyNote) {
        if (daily.date != null) {
            this.notesByDay.set(formatDate(daily.date), daily);
        }
    }

    private updateDateMembership(
        daily: DailyNote,
        oldDate: Date | null
    ) {
        if (oldDate != null) {
            this.notesByDay.delete(formatDate(oldDate));
        }

        if (daily.date != null) {
            this.notesByDay.set(formatDate(daily.date), daily);
        }
    }

    public async createNewDailyNote(day: Date) {
        const template = this.ctx.obsidian.getApp().vault.getFileByPath(this.ctx.settings.dailyTemplateLocation);

        const contents = template
            ? await this.ctx.obsidian.getApp().vault.cachedRead(template)
            : "";

        const path = this.ctx.settings.newDailyDefaultFolder + formatDate(day) + ".md";

        const preExist = this.ctx.obsidian.getApp().vault.getAbstractFileByPath(path);
        if (preExist) {
            await this.modifyDailyNoteFrontmatter(preExist as TFile, {
                date: formatDate(day)
            })
            return preExist;
        }

        const file = await this.ctx.obsidian.getApp().vault.create(
            path,
            contents
        );

        return file;
    }

    public async getOrCreateNewDailyNote(day: Date) {
       let note = this.getDailyByDy(day);
       if (note) return note.file;

       let file = (await this.createNewDailyNote(day)) as TFile;
       await this.modifyDailyNoteFrontmatter(file, {
           date: formatDate(day)
       });

        return file;
    }

    public async modifyDailyNoteFrontmatter(file: TFile, fm: DailyNoteFrontmatter) {
        await this.ctx.obsidian.getApp().fileManager.processFrontMatter(file, (frontmatter: DailyNoteFrontmatter) => {
            frontmatter.type = fm.type ?? frontmatter.type;
            frontmatter.role = fm.role ?? frontmatter.role;

            frontmatter.date = fm.date ?? frontmatter.date;
        });
    }

    getDaily(link: string, sourceFile: TFile): DailyNote | undefined {
        const file = this.ctx.obsidian.resolveLink(link, sourceFile);
        if (!(file instanceof TFile)) return;

        return this.cache.get(file);
    }

    getAllDailies(): DailyNote[] {
        return [...this.cache.values()];
    }

    getDailyByDy(day: Date): DailyNote | undefined {
        return this.notesByDay.get(formatDate(day));
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        for (const listener of this.listeners)
            listener();
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
        const daily = this.cache.get(file);
        if (!daily) return;

        if (daily.date != null) {
            this.notesByDay.delete(formatDate(daily.date));
        }

        this.cache.delete(file);

        this.notify();
    }
}
