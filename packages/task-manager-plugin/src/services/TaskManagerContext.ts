import { ClassProvider } from "@/services/ClassProvider";
import { ObsidianProvider } from "@/services/ObsidianProvider";
import { CommitmentsProvider } from "@/services/CommitmentsProvider";
import { TaskManagerSettings } from "@/settings";
import CalendarPlugin from "@/main";
import { DailyNoteProvider } from "@/services/DailyNoteProvider";

export class TaskManagerContext {
    readonly obsidian: ObsidianProvider;
    readonly classes: ClassProvider;
    readonly commitments: CommitmentsProvider;
    readonly settings: TaskManagerSettings;
    readonly dailies: DailyNoteProvider;

    constructor(plugin: CalendarPlugin, settings: TaskManagerSettings) {
        this.settings = settings;

        this.obsidian = new ObsidianProvider(plugin.app, plugin);
        this.classes = new ClassProvider(this);
        this.commitments = new CommitmentsProvider(this);
        this.dailies = new DailyNoteProvider(this);
    }
}
