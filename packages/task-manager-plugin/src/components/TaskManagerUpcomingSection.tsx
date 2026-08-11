import { memo, useContext, useMemo, useState } from "react";
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { concat } from "@personal-os/core/dist/utils/classname-utils";
import { toLocalISOString } from "@personal-os/core/dist/utils/date-utils";
import CommitmentEl from "@/components/CommitmentEl";
import { ObsidianContext } from "@/context/ObsidianContext";

const TASKS_PAGE_SIZE = 25;

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function TaskManagerUpcomingSection({ commitments }: { commitments: readonly Commitment[] }) {
    const { ctx, leaf } = useContext(ObsidianContext)!;

    const [ showPast, setShowPast ] = useState(false);
    const [ visibleCount, setVisibleCount ] = useState(TASKS_PAGE_SIZE);

    const today = useMemo(() => startOfToday(), []);

    const tasks = useMemo(() => {
        if (showPast) {
            // Past == had a due date, and it's already gone by.
            const past = commitments.filter(c =>
                c.role === "task" &&
                c.due != null &&
                c.due.getTime() < today.getTime()
            );

            past.sort((a, b) => b.due!.getTime() - a.due!.getTime());

            return past;
        }

        // "Future" == due strictly after today (or no due date at all);
        // today's tasks already live on the daily note.
        const upcoming = commitments.filter(c =>
            c.role === "task" &&
            (c.due == null || c.due.getTime() >= today.getTime())
        );

        upcoming.sort((a, b) => {
            const aDone = a.status === "done";
            const bDone = b.status === "done";
            if (aDone !== bDone) return aDone ? 1 : -1;

            if (!a.due && !b.due) return 0;
            if (!a.due) return 1;
            if (!b.due) return -1;

            return a.due.getTime() - b.due.getTime();
        });

        return upcoming;
    }, [ commitments, today, showPast ]);

    const visibleTasks = tasks.slice(0, visibleCount);

    const toggle = (next: boolean) => {
        if (next === showPast) return;
        setShowPast(next);
        setVisibleCount(TASKS_PAGE_SIZE);
    };

    const createNewTask = () => {
        ctx.commitments.createNewCommitment()
            .then(async (f) => {
                await ctx.commitments.modifyCommitmentFrontmatter(f, {
                    role: "task",
                    assigned: toLocalISOString(new Date()),
                });
                await ctx.obsidian.openInRightPane(f, leaf);
            })
            .catch(console.error);
    };

    return ( <div className="task-manager-section">
        <div className="task-manager-section-header">
            <h2>Upcoming Tasks</h2>
            <div className="task-manager-toggle">
                <button
                    className={ `task-manager-toggle-option${ showPast ? " active" : "" }` }
                    onClick={ () => toggle(true) }
                >past</button>
                <button
                    className={ `task-manager-toggle-option${ !showPast ? " active" : "" }` }
                    onClick={ () => toggle(false) }
                >present</button>
            </div>
        </div>

        { visibleTasks.length === 0 && (
            <div className="task-manager-empty-state">
                { showPast ? "No past tasks" : "No upcoming tasks" }
            </div>
        ) }

        { visibleTasks.map((c) => (
            <CommitmentEl commitment={ c } key={ c.file.path } day={true}></CommitmentEl>
        )) }

        { visibleCount < tasks.length && (
            <button className="task-manager-show-more" onClick={ () => setVisibleCount(c => c + TASKS_PAGE_SIZE) }>
                show more
            </button>
        ) }

        { !showPast && (
            <div className={ concat("task-commitment", "new-task-commitment") } onClick={ createNewTask }>
                +
            </div>
        ) }
    </div> );
}

export default memo(TaskManagerUpcomingSection);
