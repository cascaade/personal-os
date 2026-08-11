import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { memo, useContext, useEffect, useMemo, useRef } from "react";
import { concat } from "@personal-os/core/dist/utils/classname-utils";
import { ObsidianContext } from "@/views/TaskManagerView";
import { formatDate } from "@personal-os/core/dist/utils/date-utils";
import { setTooltip } from "obsidian";

function ProjectEl({ project, allCommitments }: { project: Commitment, allCommitments: readonly Commitment[] }) {
    const { ctx } = useContext(ObsidianContext)!;

    const { done, total } = useMemo(() => {
        let done = 0;
        let total = 0;

        for (const c of allCommitments) {
            if (c.role !== "task") continue;

            const parent = ctx.commitments.getProject(c);
            if (!parent || parent.file.path !== project.file.path) continue;

            total++;
            if (c.status === "done") done++;
        }

        return { done, total };
    }, [ allCommitments, ctx, project ]);

    const tagRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!tagRef.current) return;

        setTooltip(tagRef.current, total === 0 ? "No tasks yet" : `${ done } / ${ total } tasks done`, {
            placement: "top",
            delay: 200,
        });
    }, [ total, done ]);

    const percent = total === 0 ? 0 : Math.round(( done / total ) * 100);

    return ( <div
        className={ concat("task-commitment", "project-commitment") }>
        <a
            href={ project.file.path }
            data-href={ project.file.path }
            className="project-title"
            onClick={ (e) => {
                e.preventDefault();
                ctx.obsidian.getApp().workspace.getMostRecentLeaf()?.openFile(project.file).catch(console.error);
            } }>{project.due && (formatDate(project.due) + ": ")} { project.title }</a>
        <div className="project-progress-bar" ref={tagRef}>
            <div className="project-progress-fill" style={ { width: percent + "%" } }></div>
        </div>
        <span className="project-progress-percent">{ percent }%</span>
    </div> )
}

export default memo(ProjectEl);
