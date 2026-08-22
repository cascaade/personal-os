import { useContext, useEffect, useRef, useState } from "react";
import { Commitment, CommitmentFrontmatter } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { formatDate, toLocalISOString } from "@personal-os/core/dist/utils/date-utils";
import { ObsidianContext } from "@/context/ObsidianContext";
import { EffectiveFields } from "@/utils/commitment-tree";
import { setTooltip } from "obsidian";

interface CommitmentRowProps {
    commitment: Commitment,
    depth?: number,
    error?: boolean,
    overdue?: boolean,
    isProject?: boolean,
    effective: EffectiveFields,
    role: "goal" | "commitment",
}

export function CommitmentRow({ commitment, depth, error, overdue, isProject, effective, role }: CommitmentRowProps) {
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
            void ctx.commitments.changeCommitmentTitle(commitment, editValue);
        }
    };

    const cancelEditing = () => {
        cancelled.current = true;
        setEditValue(commitment.title);
        setEditing(false);
    };

    const tagRef = useRef<HTMLDivElement>(null);

    const total = effective.progress.total;
    const done = effective.progress.done;

    useEffect(() => {
        if (!tagRef.current) return;

        setTooltip(tagRef.current, total === 0 ? "No tasks yet" : `${ done } / ${ total } tasks done`, {
            placement: "top",
            delay: 200,
            gap: -8,
        });
    }, [ total, done ]);

    const progressPct = total > 0
        ? Math.round((done / total) * 100)
        : 0;

    const rowClassName = [
        "row",
        error && "error",
        overdue && "overdue",
    ].filter(Boolean).join(" ");

    const updateFrontmatter = (patch: CommitmentFrontmatter) => {
        void ctx.commitments.modifyCommitmentFrontmatter(commitment.file, patch);
    };

    return (
        <div className={ rowClassName }>
            <div
                className="cell title-cell"
                onClick={ (e) => {
                    if (!editing) {
                        e.preventDefault();
                        e.stopPropagation();
                        void ctx.obsidian.openInRightPane(commitment.file, leaf);
                    }
                } }
                onContextMenu={ (e) => {
                    if (e.ctrlKey) {
                        e.preventDefault();
                        e.stopPropagation();
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
                        ref={(el) => {
                            if (el) {
                                el.textContent = editValue;
                                el.focus();

                                const range = document.createRange();
                                range.selectNodeContents(el);
                                range.collapse(false);

                                const selection = window.getSelection();
                                selection?.removeAllRanges();
                                selection?.addRange(range);
                            }
                        }}
                        onInput={(e) => {
                            setEditValue(e.currentTarget.textContent ?? "");
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                finishEditing();
                            } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditing();
                            }
                        }}
                        onContextMenu={(e) => {
                            if (e.ctrlKey) {
                                e.preventDefault();
                                e.stopPropagation();
                                void ctx.obsidian.openInRightPane(commitment.file, leaf);
                                return;
                            }
                        }}
                        onBlur={finishEditing}
                    />
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
                                e.preventDefault();
                                e.stopPropagation();
                                void ctx.obsidian.openInRightPane(commitment.file, leaf);
                                return;
                            }
                        }}
                    >
                        { commitment.title }
                    </a>
                ) }
            </div>

            {role === "commitment" && (
                <div className="cell" ref={isProject ? tagRef : undefined}>
                    { isProject ? (
                        <div className="project-progress-bar">
                            <div className="project-progress-fill" style={ { width: progressPct + "%" } }></div>
                        </div>
                    ) : (
                        <select
                            value={ commitment.status }
                            onChange={ (e) => updateFrontmatter({ status: e.target.value }) }
                        >
                            <option value="not-started">not started</option>
                            <option value="blocked">blocked</option>
                            <option value="in-progress">in progress</option>
                            <option value="suspended">suspended</option>
                            <option value="done">done</option>
                        </select>
                    ) }
                </div>
            )}

            <div className="cell">
                <select
                    value={ effective.priority }
                    onChange={ (e) => updateFrontmatter({ priority: e.target.value }) }
                >
                    <option value="lowest">lowest</option>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="highest">highest</option>
                </select>
            </div>

            <div className="cell">
                <input
                    type="date"
                    defaultValue={
                        effective.due &&
                        formatDate(effective.due)
                    }
                    onChange={ (e) => updateFrontmatter({ due: e.target.value }) }
                />
            </div>

            {role === "commitment" && (
                <div className="cell">
                    <input
                        type="date"
                        defaultValue={
                            effective.start &&
                            formatDate(effective.start)
                        }
                        onChange={ (e) => updateFrontmatter({ start: e.target.value }) }
                    />
                </div>
            )}

            {role === "commitment" && (
                <div className="cell recurrences-cell">
                    { !isProject && (
                        <span
                            className="custom-inner-input"
                            contentEditable
                            suppressContentEditableWarning
                        >
                            { commitment.recurrences }
                        </span>
                    ) }
                </div>
            )}
        </div>
    );
}
