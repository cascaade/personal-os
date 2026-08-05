import { concat } from "@/util/classname-utils";
import { memo, useContext } from "react";
import { Commitment } from "@/services/CommitmentsProvider";
import { ObsidianContext } from "@/views/CalendarView";
import { useDraggable } from "@dnd-kit/core";

function CommitmentEl({ comm }: { comm: Commitment }) {
    const { calendarContext } = useContext(ObsidianContext)!;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: comm.file.path,
        data: {
            type: "commitment",
            commitment: comm,
        },
    });

    const style = {
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    return (<a
        href={ comm.file.path }
        className={ concat("commitment", "internal-link") }
        data-href={ comm.file.path }
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        onClick={ (e) => {
            e.preventDefault();
            calendarContext.obsidian.openNoteToRight(comm.file.path).catch(console.error);
        } }
    >
        { comm.title }
    </a>);
}

export default memo(CommitmentEl);
