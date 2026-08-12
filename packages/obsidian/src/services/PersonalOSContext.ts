import { ClassProvider } from "./ClassProvider";
import { ObsidianProvider } from "./ObsidianProvider";
import { CommitmentsProvider } from "./CommitmentsProvider";
import { DailyNoteProvider } from "./DailyNoteProvider";
import { Plugin } from "obsidian";
import ScheduleResolver from "./ScheduleResolver";

export default class PersonalOSContext {
    readonly settings: Record<string, any>;

    readonly obsidian: ObsidianProvider;
    readonly classes: ClassProvider;
    readonly commitments: CommitmentsProvider;
    readonly dailies: DailyNoteProvider;

    readonly scheduleResolver: ScheduleResolver;

    constructor(plugin: Plugin, settings: Record<string, any>) {
        this.settings = settings;

        this.obsidian = new ObsidianProvider(plugin.app, plugin);
        this.classes = new ClassProvider(this);
        this.commitments = new CommitmentsProvider(this);
        this.dailies = new DailyNoteProvider(this);

        this.scheduleResolver = new ScheduleResolver(settings.schedules)
    }
}
