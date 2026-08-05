import { TFile } from "obsidian";
import { CalendarContext } from "@/services/CalendarContext";

type ClassFrontmatter = {
    type?: string;
    role?: string;

    period?: string;
    subject?: string;

    school_year?: string;
    term?: string;
}

export type Class = {
    type: "entity";
    role: "class";

    file: TFile;
    title: string;

    period: number | null;
    subject?: string;

    school_year?: string;
    term?: string;
}

export class ClassProvider {
    private cache = new Map<TFile, Class>();
    private classesByPeriod = new Map<number, Class>();

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

    public parseClass(file: TFile | undefined) {
        if (!file) return null;

        const fm = this.ctx.obsidian.getFrontmatter(file) as ClassFrontmatter;
        if (fm?.type !== "entity" || fm?.role !== "class") return null;

        return {
            type: "entity",
            role: "class",
            file: file,
            period: fm?.period ? parseInt(fm?.period) : undefined,
            subject: fm?.subject,
            school_year: fm?.school_year,
            term: fm?.term,
        } as Class;
    }

    private reparse(file: TFile, notify: boolean | undefined = true) {
        const parsed = this.parseClass(file);

        if (!parsed) {
            this.remove(file);
            return;
        }

        const existing = this.cache.get(file);

        if (existing) {
            const oldPeriod = existing.period;

            Object.assign(existing, parsed);

            this.updatePeriodMembership(existing, oldPeriod);
        } else {
            this.cache.set(file, parsed);
            this.addPeriodMembership(parsed);
        }

        if (notify) {
            this.notify();
        }
    }

    private addPeriodMembership(clazz: Class) {
        if (clazz.period != null) {
            this.classesByPeriod.set(clazz.period, clazz);
        }
    }

    private updatePeriodMembership(
        clazz: Class,
        oldPeriod: number | null
    ) {
        if (oldPeriod === clazz.period) return;

        if (oldPeriod != null) {
            this.classesByPeriod.delete(oldPeriod);
        }

        if (clazz.period != null) {
            this.classesByPeriod.set(clazz.period, clazz);
        }
    }

    getClass(link: string, sourceFile: TFile): Class | undefined {
        const file = this.ctx.obsidian.resolveLink(link, sourceFile);
        if (!(file instanceof TFile)) return;

        return this.cache.get(file);
    }

    getClassByPeriod(period: number): Class | undefined {
        return this.classesByPeriod.get(period);
    }

    getAllClasses(): Class[] {
        return [...this.cache.values()];
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
        const clazz = this.cache.get(file);
        if (!clazz) return;

        if (clazz.period != null) {
            this.classesByPeriod.delete(clazz.period);
        }

        this.cache.delete(file);

        this.notify();
    }
}
