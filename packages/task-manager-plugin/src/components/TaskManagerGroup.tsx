import { Commitment } from "@/services/CommitmentsProvider";
import { memo, useContext } from "react";
import { Block, DayInfo, ParsedBlock } from "@/util/schedule-utils";
import CommitmentEl from "@/components/CommitmentEl";
import { InlineObsidianContext } from "@/views/InlineTaskManagerView";
import { formatDate, minutesToTime, toLocalISOString } from "@/util/date-utils";
import { concat } from "@/util/classname-utils";

function TaskManagerGroup({commitments, block, dayInfo}: {
    commitments: readonly Commitment[],
    block: ParsedBlock,
    dayInfo: DayInfo,
}) {
    const { taskManagerContext, settings } = useContext(InlineObsidianContext)!;

    const getPeriod = (c: Commitment) => {
        let classPeriod = taskManagerContext.commitments.getClass(c)?.period;
        if (classPeriod) return classPeriod;

        let project = taskManagerContext.commitments.getProject(c);
        if (!project) return;

        return taskManagerContext.commitments.getClass(project)?.period;
    }

    const cs = commitments.filter(c => c.role === "task").filter(c => getPeriod(c) == block.period);

    const createNewCommitment = () => {
        taskManagerContext.commitments.createNewCommitment()
            .then(async (f) => {
                const c = taskManagerContext.classes.getClassByPeriod(block.period);
                await taskManagerContext.commitments.modifyCommitmentFrontmatter(f, {
                    role: "task",
                    assigned: toLocalISOString(new Date()),
                    due: formatDate(dayInfo.date),
                    class: c ? `[[${ c.file.path }]]` : ""
                });
                await taskManagerContext.obsidian.openInRightPane(f);
            })
            .catch(console.error);
    }

    return (<div className="task-manager-block">
        <div className="task-manager-block-header">
            <span className="task-manager-block-period">{ block.period }</span>
            <span className={ "task-manager-block-time" }>{
                minutesToTime(
                    block.from,
                    settings.twentyFourHourDisplayTime,
                    settings.showAmPmDisplayTime
                ) + " - " + minutesToTime(
                    block.to,
                    settings.twentyFourHourDisplayTime,
                    settings.showAmPmDisplayTime
                )
            }</span>
        </div>
        { cs.map((c, i) => (
            <CommitmentEl commitment={ c } key={i}></CommitmentEl>
        )) }
        <div className={ concat("task-commitment", "new-task-commitment") } onClick={ createNewCommitment }>
            +
        </div>
    </div>)
}

export default memo(TaskManagerGroup);
