import { useCallback, useContext, useSyncExternalStore } from "react";
import { ObsidianContext } from "@/context/ObsidianContext";
import Organizer from "@/components/Organizer";

export default function TaskManager() {
    const { ctx } = useContext(ObsidianContext)!;
    const provider = ctx.commitments;

    const subscribe = useCallback(
        (listener: () => void) => provider.subscribeAll(listener),
        [ provider ]
    );

    const getSnapshot = useCallback(
        () => provider.getAllCommitmentsSnapshot(),
        [ provider ]
    );

    const commitments = useSyncExternalStore(
        subscribe,
        getSnapshot
    );

    return ( <div className="task-manager-view">
        <h1>Task Manager</h1>
        <Organizer commitments={commitments}></Organizer>
    </div> );
}
