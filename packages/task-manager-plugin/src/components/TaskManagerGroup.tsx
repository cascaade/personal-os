import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { memo, useContext } from "react";
import { DayInfo, ParsedBlock } from "@personal-os/core/dist/utils/schedule-utils";
import CommitmentEl from "@/components/CommitmentEl";
import { formatDate, minutesToTime, toLocalISOString } from "@personal-os/core/dist/utils/date-utils";
import { concat } from "@personal-os/core/dist/utils/classname-utils";
import { ObsidianContext } from "@/context/ObsidianContext";

function TaskManagerGroup({commitments, block, dayInfo}: {
    commitments: readonly Commitment[],
    block: ParsedBlock,
    dayInfo: DayInfo,
}) {
    const { ctx, settings, leaf } = useContext(ObsidianContext)!;

    const cs = commitments.filter(c => c.role === "task").filter(c => ctx.commitments.getPeriod(c) == block.period);

    const createNewCommitment = () => {
        ctx.commitments.createNewCommitment()
            .then(async (f) => {
                const c = ctx.classes.getClassByPeriod(block.period);
                await ctx.commitments.modifyCommitmentFrontmatter(f, {
                    role: "task",
                    assigned: toLocalISOString(new Date()),
                    due: formatDate(dayInfo.date),
                    class: c ? `[[${ c.file.path }]]` : ""
                });
                await ctx.obsidian.openInRightPane(f, leaf);
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
