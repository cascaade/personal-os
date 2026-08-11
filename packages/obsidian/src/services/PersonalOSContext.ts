import { ClassProvider } from "./ClassProvider";
import { ObsidianProvider } from "./ObsidianProvider";
import { CommitmentsProvider } from "./CommitmentsProvider";
import { DailyNoteProvider } from "./DailyNoteProvider";
import { Plugin } from "obsidian";

export default class PersonalOSContext {
    readonly obsidian: ObsidianProvider;
    readonly classes: ClassProvider;
    readonly commitments: CommitmentsProvider;
    readonly settings: Record<string, any>;
    readonly dailies: DailyNoteProvider;

    constructor(plugin: Plugin, settings: Record<string, any>, viewType: string) {
        this.settings = settings;

        this.obsidian = new ObsidianProvider(plugin.app, plugin, viewType);
        this.classes = new ClassProvider(this);
        this.commitments = new CommitmentsProvider(this);
        this.dailies = new DailyNoteProvider(this);
    }
}
