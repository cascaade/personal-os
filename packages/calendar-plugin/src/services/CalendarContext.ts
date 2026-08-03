import { ClassProvider } from "@/services/ClassProvider";
import { ObsidianProvider } from "@/services/ObsidianProvider";
import { App } from "obsidian";
import { CommitmentsProvider } from "@/services/CommitmentsProvider";

export class CalendarContext {
    readonly obsidian: ObsidianProvider;
    readonly classes: ClassProvider;
    readonly commitments: CommitmentsProvider;

    constructor(app: App) {
        this.obsidian = new ObsidianProvider(app);

        this.classes = new ClassProvider(this);
        this.commitments = new CommitmentsProvider(this);
    }
}
