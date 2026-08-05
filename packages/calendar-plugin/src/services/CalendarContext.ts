import { ClassProvider } from "@/services/ClassProvider";
import { ObsidianProvider } from "@/services/ObsidianProvider";
import { App } from "obsidian";
import { CommitmentsProvider } from "@/services/CommitmentsProvider";
import { CalendarSettings } from "@/settings";
import CalendarPlugin from "@/main";

export class CalendarContext {
    readonly obsidian: ObsidianProvider;
    readonly classes: ClassProvider;
    readonly commitments: CommitmentsProvider;
    readonly settings: CalendarSettings;

    constructor(plugin: CalendarPlugin, settings: CalendarSettings) {
        this.settings = settings;

        this.obsidian = new ObsidianProvider(plugin.app, plugin);
        this.classes = new ClassProvider(this);
        this.commitments = new CommitmentsProvider(this);
    }
}
