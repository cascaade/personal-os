import { Plugin, WorkspaceLeaf, } from 'obsidian';
import { CalendarSettings, CalendarSettingTab, DEFAULT_SETTINGS, } from './settings';
import { CalendarView, VIEW_TYPE_CALENDAR } from "./views/CalendarView";

export default class CalendarPlugin extends Plugin {
    settings!: CalendarSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            VIEW_TYPE_CALENDAR,
            (leaf) => new CalendarView(leaf, this, this.settings),
        );

        const openCalendar = async () => {
            let leaf: WorkspaceLeaf | undefined | null =
                this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];

            if (!leaf) {
                leaf = this.app.workspace.getLeaf(true);

                if (!leaf) return;

                await leaf.setViewState({
                    type: VIEW_TYPE_CALENDAR,
                    active: true,
                });
            }

            await this.app.workspace.revealLeaf(leaf);
        }

        const ribbonIcon = this.addRibbonIcon('calendar-check', 'Open calendar', async (_evt: MouseEvent) => {
            await openCalendar();
        });

        ribbonIcon.addClass("calendar-ribbon-icon");

        this.addCommand({
            id: "open-calendar",
            name: "Open Calendar",
            callback: openCalendar
        });

        this.addCommand({
            id: "duplicate-last-commitment",
            name: "Duplicate last commitment",
            hotkeys: [
                {
                    modifiers: ["Mod"],
                    key: "D",
                },
            ],
            callback: () => {
                const leaf = this.app.workspace
                    .getLeavesOfType(VIEW_TYPE_CALENDAR)[0];

                if (!leaf) return;

                const view = leaf.view;

                if (view instanceof CalendarView) {
                    view.duplicateLastCommitment();
                }
            },
        });

        this.addSettingTab(new CalendarSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            ( await this.loadData() ) as Partial<CalendarSettings>,
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {

    }
}
