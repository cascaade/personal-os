import { concat } from "@/util/classname-utils";
import React, { memo, useContext, useMemo } from "react";
import { Commitment } from "@/services/CommitmentsProvider";
import { ObsidianContext } from "@/views/CalendarView";
import { useDraggable } from "@dnd-kit/core";
import { Menu } from "obsidian";
import { containsEmoji } from "@/util/emoji-utils";

function CommitmentEl({ commitment, draggable }: { commitment: Commitment, draggable: boolean }) {
    const { calendarContext } = useContext(ObsidianContext)!;

    const project = useMemo(() => {
        return calendarContext.commitments.getProject(commitment);
    }, [commitment]);

    const getProjectPrefix = () => (project && (containsEmoji(project.title.charAt(0)) ? project.title.charAt(0) : project.title.charAt(0) + ": "));

    const getCommitmentName = () => (calendarContext.commitments.getDuplicate(commitment)?.title ?? commitment.title);

    if (draggable) {
        const {
            attributes,
            listeners,
            setNodeRef,
            isDragging,
        } = useDraggable({
            id: commitment.file.path,
            data: {
                type: "commitment",
                commitment: commitment,
            },
        });

        const style = {
            // transform: transform
            //     ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            //     : undefined,
            opacity: isDragging ? 0 : 1,
        };

        const onContextMenu = (e: React.MouseEvent) => {
            e.preventDefault();

            if (e.ctrlKey) {
                calendarContext.obsidian.openNoteToRight(commitment.file.path)
                    .catch(console.error);
                return;
            }

            const menu = new Menu();

            menu.addItem(item =>
                item
                    .setTitle("Duplicate")
                    .setIcon("copy")
                    .onClick(() => {
                        calendarContext.commitments.duplicateCommitment(commitment)
                            .catch(console.error);
                    })
            );

            menu.addSeparator();

            menu.addItem(item =>
                item
                    .setTitle("Delete")
                    .setIcon("delete")
                    .onClick(() => {
                        calendarContext.obsidian.getApp().fileManager.promptForDeletion(commitment.file)
                            .catch(console.error);
                    })
            );

            menu.showAtMouseEvent(e.nativeEvent);
        };

        return (<a
            href={ commitment.file.path }
            className={ concat("commitment", "internal-link") }
            data-href={ commitment.file.path }
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={style}
            onClick={ (e) => {
                e.preventDefault();
                calendarContext.obsidian.openNoteToRight(commitment.file.path).catch(console.error);
            } }
            onContextMenu={ onContextMenu }
        >
            {getProjectPrefix()} {getCommitmentName()}
        </a>);
    }

    return (<a
        href={ commitment.file.path }
        className={ concat("commitment", "dragging") }
        data-href={ commitment.file.path }
    >
        {getProjectPrefix()} {getCommitmentName()}
    </a>);
}

export default memo(CommitmentEl);
