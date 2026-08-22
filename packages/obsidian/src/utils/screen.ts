import { Platform } from "obsidian";

export function isLargeScreen() {
    return (Platform.isDesktop || Platform.isTablet);
}
