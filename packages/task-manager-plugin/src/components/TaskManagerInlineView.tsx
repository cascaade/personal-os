import { useCallback, useContext, useSyncExternalStore } from "react";
import { formatDate, toLocalISOString } from "@personal-os/core/dist/utils/date-utils";
import CommitmentEl from "@/components/CommitmentEl";
import { scheduleResolver } from "@personal-os/obsidian/dist/services/ScheduleResolver";
import TaskManagerGroup from "@/components/TaskManagerGroup";
import { concat } from "@personal-os/core/dist/utils/classname-utils";
import { ObsidianContext } from "@/context/ObsidianContext";

export default function TaskManagerInlineView({ date }: { date: Date }) {
    const { ctx, leaf } = useContext(ObsidianContext)!;

    const provider = ctx.commitments;

    const key = formatDate(date);

    const subscribe = useCallback(
        (listener: () => void) =>
            provider.subscribe(key, listener),
        [ provider, key ]
    );

    const getSnapshot = useCallback(
        () => provider.getCommitments(date),
        [ provider, date ]
    );

    const commitments = useSyncExternalStore(
        subscribe,
        getSnapshot
    );

    const dayInfo = scheduleResolver.get(date);

    const createNewCommitment = () => {
        ctx.commitments.createNewCommitment().then(async (f) => {
            await ctx.commitments.modifyCommitmentFrontmatter(f, {
                role: "event",
                assigned: toLocalISOString(new Date()),
                due: formatDate(dayInfo.date)
            });
            await ctx.obsidian.openInRightPane(f, leaf);
        }).catch(console.error);
    }

    const csWithoutClass = commitments.filter(c => c.role === "task").filter(c => {
        const period = ctx.commitments.getPeriod(c);
        if (period == undefined) return true;

        const found = dayInfo.blocks.some(block => block.period == period);
        return !found;
    });

    return ( <div className="task-manager-view-inline">
        <h2>Task Manager</h2>
        { dayInfo.blocks.map((block, i) => (
                <TaskManagerGroup commitments={ commitments } block={ block } dayInfo={ dayInfo }
                                  key={ i }></TaskManagerGroup>
        )) }
        <hr/>
        { csWithoutClass.map((c, i) => (
            <CommitmentEl commitment={ c } key={i}></CommitmentEl>
        )) }
        <div className={ concat("task-commitment", "new-task-commitment") } onClick={ createNewCommitment }>
            +
        </div>
    </div> );
}
