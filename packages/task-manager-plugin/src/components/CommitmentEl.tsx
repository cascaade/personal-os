import { Commitment } from "@/services/CommitmentsProvider";
import { memo, useContext } from "react";
import { concat } from "@/util/classname-utils";
import { InlineObsidianContext } from "@/views/InlineTaskManagerView";

function CommitmentEl({ commitment }: { commitment: Commitment }) {
    const { taskManagerContext } = useContext(InlineObsidianContext)!;

    const project = taskManagerContext.commitments.getProject(commitment);

    return ( <div className={ concat("task-commitment", "internal-link") }>
        <select>
            <option value="not-started">not started</option>
            <option value="in-progress">in progress</option>
            <option value="blocked">blocked</option>
            <option value="done">done</option>
            <option value="suspended">suspended</option>
        </select>
        <a
            href={ commitment.file.path }
            data-href={ commitment.file.path }
            onClick={ (e) => {
                e.preventDefault();
                taskManagerContext.obsidian.getApp().workspace.getMostRecentLeaf()?.openFile(commitment.file).catch(console.error);
            } }>{ commitment.title }</a>
        { project && (
            <div className="task-project-tag"> { project.title } </div>
        ) }
    </div> )
}

export default memo(CommitmentEl);
