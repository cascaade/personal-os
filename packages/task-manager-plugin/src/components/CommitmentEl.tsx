import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { memo, useContext } from "react";
import { concat } from "@personal-os/core/dist/utils/classname-utils";
import { InlineObsidianContext } from "@/views/InlineTaskManagerView";
import { ObsidianContext } from "@/views/TaskManagerView";
import { formatDate } from "@personal-os/core/dist/utils/date-utils";
import { emptyStringIfFalsey } from "@personal-os/core/dist/utils/general-utils";

function CommitmentEl({ commitment, day }: { commitment: Commitment, day?: boolean }) {
    const { ctx } = (useContext(InlineObsidianContext) ?? useContext(ObsidianContext))!;

    const project = ctx.commitments.getProject(commitment);

    return ( <div className={ concat("task-commitment", "internal-link", "status-" + commitment.status) }>
        <select value={ commitment.status } onChange={ (e) => {
            void ctx.commitments.modifyCommitmentFrontmatter(commitment.file, {
                status: e.target.value,
            })
        } }>
            <option value="not-started">not started</option>
            <option value="blocked">blocked</option>
            <option value="in-progress">in progress</option>
            <option value="suspended">suspended</option>
            <option value="done">done</option>
        </select>
        <a
            href={ commitment.file.path }
            data-href={ commitment.file.path }
            onClick={ (e) => {
                e.preventDefault();
                ctx.obsidian.getApp().workspace.getMostRecentLeaf()?.openFile(commitment.file).catch(console.error);
            } }>{ commitment.status == "done" ? ( <del>{day && commitment.due && (formatDate(commitment.due) + ": ")} { commitment.title }</del> ) : ( emptyStringIfFalsey(day && commitment.due && (formatDate(commitment.due) + ": ")) + commitment.title ) }</a>
        { project && (
            <a className="task-project-tag" onClick={ (e) => {
                e.preventDefault();
                ctx.obsidian.getApp().workspace.getMostRecentLeaf()?.openFile(project.file).catch(console.error);
            } }> { project.title } </a>
        ) }
    </div> )
}

export default memo(CommitmentEl);
