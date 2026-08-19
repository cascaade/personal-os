import { CalendarClock, CalendarPlus, CircleCheck, FileText, Flag, Repeat, History, ListTodo } from "lucide-react";
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { useContext, useMemo, useState } from "react";
import { ObsidianContext } from "@/context/ObsidianContext";
import { CommitmentRow } from "@/components/CommitmentRow";

type ViewMode = "upcoming" | "past";

export default function Organizer() {
    const { ctx } = useContext(ObsidianContext)!;
    const [viewMode, setViewMode] = useState<ViewMode>("upcoming");

    const commitments: readonly Commitment[] = ctx.commitments.getAllCommitmentsSnapshot();

    const visibleCommitments = useMemo(() => {
        const now = Date.now();

        const withDue = commitments.filter((c) => c.due != null);

        const filtered = withDue.filter((c) =>
            viewMode === "past"
                ? c.due!.getTime() < now
                : c.due!.getTime() >= now
        );

        // past: newest first (descending). upcoming: oldest first (ascending).
        return [...filtered].sort((a, b) =>
            viewMode === "past"
                ? b.due!.getTime() - a.due!.getTime()
                : a.due!.getTime() - b.due!.getTime()
        );
    }, [commitments, viewMode]);

    return (<div className="tm-organizer">
        <div className="table-header">
            <h2>Upcoming Tasks</h2>
            <div className="tm-toggle">
                <button
                    className={viewMode === "upcoming" ? "active" : ""}
                    onClick={() => setViewMode("upcoming")}
                >
                    <ListTodo className="header-icon" /> Upcoming
                </button>
                <button
                    className={viewMode === "past" ? "active" : ""}
                    onClick={() => setViewMode("past")}
                >
                    <History className="header-icon" /> Past
                </button>
            </div>
        </div>

        <div className="table">
            <div className="header">
                <div className="cell"><FileText className="header-icon" /> Name</div>
                <div className="cell"><CircleCheck className="header-icon" /> Status</div>
                <div className="cell"><Flag className="header-icon" /> Priority</div>
                <div className="cell"><CalendarClock className="header-icon" /> Due</div>
                <div className="cell"><CalendarPlus className="header-icon" /> Start</div>
                <div className="cell"><Repeat className="header-icon" /> Recurrences</div>
            </div>
            {
                visibleCommitments.map((commitment) => (
                    <CommitmentRow
                        key={commitment.file.path}
                        commitment={commitment}
                    />
                ))
            }
        </div>
    </div>)
}
