import { useCallback, useContext, useSyncExternalStore } from "react";
import { formatDate, toLocalISOString } from "@/util/date-utils";
import { InlineObsidianContext } from "@/views/InlineTaskManagerView";
import CommitmentEl from "@/components/CommitmentEl";
import { scheduleResolver } from "@/services/ScheduleResolver";
import TaskManagerGroup from "@/components/TaskManagerGroup";
import { Commitment } from "@/services/CommitmentsProvider";
import { concat } from "@/util/classname-utils";

export default function TaskManagerInlineView({ date }: { date: Date }) {
    const { taskManagerContext } = useContext(InlineObsidianContext)!;

    const getPeriod = (c: Commitment) => {
        let classPeriod = taskManagerContext.commitments.getClass(c)?.period;
        if (classPeriod) return classPeriod;

        let project = taskManagerContext.commitments.getProject(c);
        if (!project) return;

        return taskManagerContext.commitments.getClass(project)?.period;
    }

    const provider = taskManagerContext.commitments;

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
        taskManagerContext.commitments.createNewCommitment().then(async (f) => {
            await taskManagerContext.commitments.modifyCommitmentFrontmatter(f, {
                role: "event",
                assigned: toLocalISOString(new Date()),
                due: formatDate(dayInfo.date)
            });
            await taskManagerContext.obsidian.openInRightPane(f);
        }).catch(console.error);
    }

    const csWithoutClass = commitments.filter(c => c.role === "task").filter(c => {
        const period = getPeriod(c);
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
