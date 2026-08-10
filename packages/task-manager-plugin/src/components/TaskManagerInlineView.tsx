import { useCallback, useContext, useSyncExternalStore } from "react";
import { formatDate } from "@/util/date-utils";
import { InlineObsidianContext } from "@/views/InlineTaskManagerView";
import CommitmentEl from "@/components/CommitmentEl";

export default function TaskManagerInlineView({ date }: { date: Date }) {
    const { taskManagerContext } = useContext(InlineObsidianContext)!;

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

    return ( <div className="task-manager-view-inline">
        <h2>Task Manager</h2>
        { commitments.map(c => (
            <CommitmentEl commitment={ c }></CommitmentEl>
        )) }
    </div> );
}
