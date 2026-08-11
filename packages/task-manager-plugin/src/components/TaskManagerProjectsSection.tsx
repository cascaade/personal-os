import { memo, useContext, useMemo, useState } from "react";
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { concat } from "@personal-os/core/dist/utils/classname-utils";
import { startOfToday, toLocalISOString } from "@personal-os/core/dist/utils/date-utils";
import ProjectEl from "@/components/ProjectEl";
import { ObsidianContext } from "@/context/ObsidianContext";

const PROJECTS_PAGE_SIZE = 10;

function TaskManagerProjectsSection({ commitments }: { commitments: readonly Commitment[] }) {
    const { ctx, leaf } = useContext(ObsidianContext)!;

    const [ showPast, setShowPast ] = useState(false);
    const [ visibleCount, setVisibleCount ] = useState(PROJECTS_PAGE_SIZE);

    const today = useMemo(() => startOfToday(), []);

    const projects = useMemo(() => {
        const all = commitments.filter(c => c.role === "project");

        const filtered = all.filter(p => {
            // No due date yet == still ongoing, so it lives with "present".
            if (!p.due) return !showPast;

            const isPast = p.due.getTime() < today.getTime();
            return showPast ? isPast : !isPast;
        });

        filtered.sort((a, b) => {
            if (!a.due && !b.due) return 0;
            if (!a.due) return 1;
            if (!b.due) return -1;

            return showPast
                ? b.due.getTime() - a.due.getTime()
                : a.due.getTime() - b.due.getTime();
        });

        return filtered;
    }, [ commitments, showPast, today ]);

    const visibleProjects = projects.slice(0, visibleCount);

    const toggle = (next: boolean) => {
        if (next === showPast) return;
        setShowPast(next);
        setVisibleCount(PROJECTS_PAGE_SIZE);
    };

    const createNewProject = () => {
        ctx.commitments.createNewCommitment()
            .then(async (f) => {
                await ctx.commitments.modifyCommitmentFrontmatter(f, {
                    role: "project",
                    assigned: toLocalISOString(new Date()),
                });
                await ctx.obsidian.openInRightPane(f, leaf);
            })
            .catch(console.error);
    };

    return ( <div className="task-manager-section">
        <div className="task-manager-section-header">
            <h2>Projects</h2>
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

        { visibleProjects.length === 0 && (
            <div className="task-manager-empty-state">
                { showPast ? "No past projects" : "No ongoing or upcoming projects" }
            </div>
        ) }

        { visibleProjects.map((p) => (
            <ProjectEl project={ p } allCommitments={ commitments } key={ p.file.path }></ProjectEl>
        )) }

        { visibleCount < projects.length && (
            <button className="task-manager-show-more" onClick={ () => setVisibleCount(c => c + PROJECTS_PAGE_SIZE) }>
                show more
            </button>
        ) }

        <div className={ concat("task-commitment", "new-task-commitment") } onClick={ createNewProject }>
            +
        </div>
    </div> );
}

export default memo(TaskManagerProjectsSection);
