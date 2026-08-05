import { concat } from "@/util/classname-utils";
import { memo, useContext } from "react";
import { Commitment } from "@/services/CommitmentsProvider";
import { ObsidianContext } from "@/views/CalendarView";
import { useDraggable } from "@dnd-kit/core";

function CommitmentEl({ commitment, draggable }: { commitment: Commitment, draggable: boolean }) {
    const { calendarContext } = useContext(ObsidianContext)!;

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
        >
            { commitment.title }
        </a>);
    }

    return (<a
        href={ commitment.file.path }
        className={ concat("commitment", "dragging") }
        data-href={ commitment.file.path }
        onClick={ (e) => {
            e.preventDefault();
            calendarContext.obsidian.openNoteToRight(commitment.file.path).catch(console.error);
        } }
    >
        { commitment.title }
    </a>);
}

export default memo(CommitmentEl);
