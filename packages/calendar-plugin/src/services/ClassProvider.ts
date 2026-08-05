import { App, parseLinktext, TFile } from "obsidian";
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

    period?: number;
    subject?: string;

    school_year?: string;
    term?: string;
}

export class ClassProvider {
    private cache: Map<string, Class> | null = null;

    constructor(private ctx: CalendarContext) {}

    public parseClass(file: TFile | undefined) {
        if (!file) return null;

        const fm = this.ctx.obsidian.getFrontmatter(file) as ClassFrontmatter;
        if (fm?.type !== "entity" || fm?.role !== "class") return null;

        return {
            type: "entity",
            role: "class",
            file: file,
            title: file.basename,
            period: fm?.period ? parseInt(fm?.period) : undefined,
            subject: fm?.subject,
            school_year: fm?.school_year,
            term: fm?.term,
        } as Class;
    }

    private async buildCache() {
        this.cache = new Map();

        for (const file of this.ctx.obsidian.getMarkdownFiles()) {
            if (this.ctx.obsidian.isInTemplatesFolder(file)) continue;

            const clazz = this.parseClass(file);
            if (clazz) {
                this.cache.set(file.path, clazz);
            }
        }
    }

    public async getClass(path: string): Promise<Class | undefined> {
        if (this.cache === null) {
            await this.buildCache();
        }

        return this.cache!.get(path);
    }

    public async getClassByPeriod(period: number): Promise<Class | undefined> {
        if (this.cache === null) {
            await this.buildCache();
        }

        const result = [...this.cache!.values()].find(c => c.period === period);

        return result;
    }

    public async getAllClasses(): Promise<Class[]> {
        if (this.cache === null) {
            await this.buildCache();
        }

        return [...this.cache!.values()];
    }
}
