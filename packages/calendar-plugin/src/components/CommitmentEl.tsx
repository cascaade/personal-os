import { concat } from "@personal-os/core/dist/utils/classname-utils";
import React, { memo, useContext, useMemo } from "react";
import { Commitment } from "@personal-os/obsidian/src/services/CommitmentsProvider";
import { ObsidianContext } from "@/views/CalendarView";
import { useDraggable } from "@dnd-kit/core";
import { Menu } from "obsidian";
import { containsEmoji } from "@personal-os/core/dist/utils/emoji-utils";
import { dateToMinutes, minutesToTime } from "@personal-os/core/dist/utils/date-utils";

function CommitmentEl({ commitment, draggable, duplicateOnDrag }: { commitment: Commitment, draggable: boolean, duplicateOnDrag: boolean }) {
    const { ctx, settings } = useContext(ObsidianContext)!;

    const project = useMemo(() => {
        return ctx.commitments.getProject(commitment);
    }, [commitment]);

    const getProjectPrefix = () => (project && (containsEmoji(project.title.charAt(0).trim().replaceAll(/^\uFE0F/g, '')) ? project.title.charAt(0) : project.title.charAt(0) + ": "))?.replaceAll(/^\uFE0F/g, '');

    const getCommitmentName = () => ((commitment.role === "project_expo" && ctx.commitments.getProject(commitment)?.title.substring(1)) || (ctx.commitments.getDuplicate(commitment)?.title ?? commitment.title)).trim().replaceAll(/^\uFE0F/g, '');

    if (draggable) {
        const {
            attributes,
            listeners,
            setNodeRef,
            isDragging,
            active
        } = useDraggable({
            id: commitment.file.path,
            data: {
                type: "commitment",
                commitment: commitment,
                duplicateOnDrag: duplicateOnDrag ?? false,
            },
        });

        const style = {
            // transform: transform
            //     ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            //     : undefined,
            opacity: isDragging ? (active?.data?.current?.duplicateOnDrag ? 0.75 : 0) : 1,
        };

        const onContextMenu = (e: React.MouseEvent) => {
            e.preventDefault();

            if (e.ctrlKey) {
                // calendarContext.obsidian.openNoteToRight(commitment.file.path)
                //     .catch(console.error);
                return;
            }

            const menu = new Menu();

            menu.addItem(item =>
                item
                    .setTitle("Duplicate")
                    .setIcon("copy")
                    .onClick(() => {
                        ctx.commitments.duplicateCommitment(commitment)
                            .catch(console.error);
                    })
            );

            menu.addSeparator();

            menu.addItem(item =>
                item
                    .setTitle("Delete")
                    .setIcon("delete")
                    .onClick(() => {
                        ctx.obsidian.getApp().fileManager.promptForDeletion(commitment.file)
                            .catch(console.error);
                    })
            );

            menu.showAtMouseEvent(e.nativeEvent);
        };

        return (<a
            href={ commitment.file.path }
            className={ concat("commitment", "internal-link", "role-" + commitment.role) }
            data-href={ commitment.file.path }
            ref={setNodeRef}
            draggable={ false }
            {...listeners}
            {...attributes}
            style={style}
            onClick={ (e) => {
                e.preventDefault();
                ctx.obsidian.openNoteToRight(commitment.file.path).catch(console.error);
            } }
            onContextMenu={ onContextMenu }
        >
            {commitment.start && (
                <span className="commitment-start-time">{minutesToTime(dateToMinutes(commitment.start), settings.twentyFourHourDisplayTime, true)}</span>
            ) }
            {getProjectPrefix()} {getCommitmentName()}
        </a>);
    }

    return (<a
        href={ commitment.file.path }
        draggable={false}
        className={ concat("commitment", "dragging", "role-" + commitment.role) }
        data-href={ commitment.file.path }
    >
        {commitment.start && (
            <span className="commitment-start-time">{minutesToTime(dateToMinutes(commitment.start), settings.twentyFourHourDisplayTime, settings.showAmPmDisplayTime)}</span>
        ) }
        {getProjectPrefix()} {getCommitmentName()}
    </a>);
}

export default memo(CommitmentEl);
