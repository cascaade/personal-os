import { Editor, Plugin } from "obsidian";

export default class UnderlinePlugin extends Plugin {
    async onload() {
        this.addCommand({
            id: "toggle-underline-html",
            name: "Underline with <u> tags",
            hotkeys: [
                {
                    modifiers: ["Mod"],
                    key: "u",
                },
            ],
            editorCallback: (editor: Editor) => {
                const selection = editor.getSelection();

                const from = editor.getCursor("from");
                const to = editor.getCursor("to");

                const before = editor.getRange(
                    { line: from.line, ch: Math.max(0, from.ch - 3) },
                    from
                );

                const after = editor.getRange(
                    to,
                    { line: to.line, ch: to.ch + 4 }
                );

                if (before === "<u>" && after === "</u>") {
                    // Remove surrounding tags
                    editor.replaceRange("", to, { line: to.line, ch: to.ch + 4 });
                    editor.replaceRange(
                        "",
                        { line: from.line, ch: from.ch - 3 },
                        from
                    );

                    // Keep the same text selected
                    editor.setSelection(
                        { line: from.line, ch: from.ch - 3 },
                        { line: to.line, ch: to.ch - 3 }
                    );
                } else {
                    // Add surrounding tags
                    editor.replaceRange("</u>", to);
                    editor.replaceRange("<u>", from);

                    // Keep the original text selected
                    editor.setSelection(
                        { line: from.line, ch: from.ch + 3 },
                        { line: to.line, ch: to.ch + 3 }
                    );
                }
            }
        });
    }
}
