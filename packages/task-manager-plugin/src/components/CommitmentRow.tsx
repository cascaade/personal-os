import { useContext, useRef, useState } from "react";
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { toLocalISOString } from "@personal-os/core/dist/utils/date-utils";
import { ObsidianContext } from "@/context/ObsidianContext";

interface CommitmentRowProps {
    commitment: Commitment,
    depth?: number,
    error?: boolean
}

export function CommitmentRow({ commitment, depth, error }: CommitmentRowProps) {
    const { ctx, leaf } = useContext(ObsidianContext)!;

    const [ editing, setEditing ] = useState(false);
    const [ editValue, setEditValue ] = useState(commitment.title);
    const cancelled = useRef(false);

    const startEditing = () => {
        setEditValue(commitment.title);
        setEditing(true);
    };

    const finishEditing = () => {
        if (cancelled.current) {
            cancelled.current = false;
            setEditing(false);
            return;
        }

        setEditing(false);

        if (editValue !== commitment.title) {
            // Save editValue here
        }
    };

    const cancelEditing = () => {
        cancelled.current = true;
        setEditValue(commitment.title);
        setEditing(false);
    };

    return (
        <div className="row">
            <div
                className="cell title-cell"
                onClick={ (e) => {
                    if (!editing) {
                        void ctx.obsidian.openInRightPane(commitment.file, leaf);
                    }
                } }
            >
                <pre className="tab-indent">{ "\t".repeat(depth ?? 0) }</pre>

                { editing ? (
                    <span
                        className="custom-inner-input"
                        contentEditable
                        suppressContentEditableWarning
                        ref={ (el) => {
                            if (el) {
                                el.focus();

                                const range = document.createRange();
                                range.selectNodeContents(el);

                                const selection = window.getSelection();
                                selection?.removeAllRanges();
                                selection?.addRange(range);
                            }
                        } }
                        onInput={ (e) => {
                            setEditValue(e.currentTarget.textContent ?? "");
                        } }
                        onKeyDown={ (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                finishEditing();
                            } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditing();
                            }
                        } }
                        onBlur={ finishEditing }
                    >
                        { editValue }
                    </span>
                ) : (
                    <a
                        href={ commitment.file.path }
                        className="custom-inner-input"
                        onClick={ (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEditing();
                        } }
                        onContextMenu={(e) => {
                            if (e.ctrlKey) {
                                void ctx.obsidian.openInRightPane(commitment.file, leaf);
                                return;
                            }
                        }}
                    >
                        { commitment.title }
                    </a>
                ) }
            </div>

            <div className="cell">
                <select value={ commitment.status }>
                    <option value="not-started">not started</option>
                    <option value="blocked">blocked</option>
                    <option value="in-progress">in progress</option>
                    <option value="suspended">suspended</option>
                    <option value="done">done</option>
                </select>
            </div>

            <div className="cell">
                <select value={ commitment.priority }>
                    <option value="lowest">lowest</option>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="highest">highest</option>
                </select>
            </div>

            <div className="cell">
                <input
                    type="datetime-local"
                    value={
                        commitment.due &&
                        toLocalISOString(commitment.due)
                    }
                />
            </div>

            <div className="cell">
                <input
                    type="datetime-local"
                    value={
                        commitment.start &&
                        toLocalISOString(commitment.start)
                    }
                />
            </div>

            <div className="cell">
                <span
                    className="custom-inner-input"
                    contentEditable
                    suppressContentEditableWarning
                >
                    { commitment.recurrences }
                </span>
            </div>
        </div>
    );
}
