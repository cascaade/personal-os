import { TFile } from "obsidian";

export type Class = {
    file: TFile;
}

export type Commitment = {
    file: TFile;

    title: string;
    role?: string;

    assigned?: Date;
    status?: string;

    start?: Date;
    due?: Date;

    class?: Class;
    project?: Commitment;

    actual_effort?: number;
}
