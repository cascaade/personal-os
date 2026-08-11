import { App, WorkspaceLeaf } from "obsidian";
import { createContext } from "react";
import PersonalOSContext from "@personal-os/obsidian/dist/services/PersonalOSContext";
import { TaskManagerSettings } from "@/settings";

export type ObsidianContextProps = {
    readonly app: App;
    readonly ctx: PersonalOSContext;
    readonly settings: TaskManagerSettings;
    readonly leaf: WorkspaceLeaf;
}

export const ObsidianContext = createContext<ObsidianContextProps | null>(null);
