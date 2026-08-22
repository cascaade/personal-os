import {
    CalendarClock,
    CalendarPlus,
    CircleCheck,
    FileText,
    Flag,
    Repeat,
    History,
    ListTodo,
    Logs
} from "lucide-react";
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { Fragment, useContext, useMemo, useState } from "react";
import { ObsidianContext } from "@/context/ObsidianContext";
import { CommitmentRow } from "@/components/CommitmentRow";
import { buildCommitmentTree, CommitmentTreeNode, filterTreeForView, sortTree } from "@/utils/commitment-tree";
import { isLargeScreen } from "@personal-os/obsidian/dist/utils/screen";
import { concat } from "@personal-os/core/dist/utils/classname-utils";

type ViewMode = "upcoming" | "past" | "all";

interface OrganizerProps {
    commitments: readonly Commitment[];
}

export default function Organizer({ commitments }: OrganizerProps) {
    const { ctx } = useContext(ObsidianContext)!;
    const [viewMode, setViewMode] = useState<ViewMode>("upcoming");

    const { roots, goalRoots } = useMemo(() => {
        const roots = buildCommitmentTree(commitments, ctx.commitments);
        const newestFirst = viewMode === "past";

        console.warn(roots);

        return {
            roots: viewMode === "all" ? sortTree(roots, true) : sortTree(filterTreeForView(roots, viewMode), newestFirst),
            goalRoots: sortTree(filterTreeForView(roots, "goals"), true),
        };
    }, [commitments, ctx.commitments, viewMode]);

    const renderNode = (node: CommitmentTreeNode, depth: number, role: "commitment" | "goal") => (
        <Fragment key={node.commitment.file.path}>
            <CommitmentRow
                commitment={node.commitment}
                depth={depth}
                error={node.error}
                overdue={node.overdue}
                isProject={node.commitment.role === "project"}
                effective={node.effective}
                role={role}
            />
            {node.children.map((child) => renderNode(child, depth + 1, role))}
        </Fragment>
    );

    return (<div className={concat("tm-organizer", !isLargeScreen() && "platform-small") }>
        <div className="goals-table-header table-header">
            <h2>Goals ({goalRoots.length})</h2>
        </div>

        <div className="goals-table table">
            <div className="header-row">
                <div className="cell"><FileText className="header-icon" /> Name</div>
                <div className="cell"><Flag className="header-icon" /> Priority</div>
                <div className="cell"><CalendarClock className="header-icon" /> Due</div>
            </div>
            {goalRoots.map((root) => renderNode(root, 0, "goal"))}
        </div>

        <div className="commitments-table-header table-header">
            <h2>{ viewMode == "upcoming" ? "Upcoming" : "Past" } Tasks ({roots.length})</h2>
            <div className="tm-toggle">
                <button className={viewMode === "upcoming" ? "active" : ""} onClick={() => setViewMode("upcoming")}>
                    <ListTodo className="header-icon" /> Upcoming
                </button>
                <button className={viewMode === "past" ? "active" : ""} onClick={() => setViewMode("past")}>
                    <History className="header-icon" /> Past
                </button>
                <button className={viewMode === "all" ? "active" : ""} onClick={() => setViewMode("all")}>
                    <Logs className="header-icon" /> All
                </button>
            </div>
        </div>

        <div className="commitments-table table">
            <div className="header-row">
                <div className="cell"><FileText className="header-icon" /> Name</div>
                <div className="cell"><CircleCheck className="header-icon" /> Status</div>
                {isLargeScreen() && (
                    <div className="cell"><Flag className="header-icon" /> Priority</div>
                )}
                <div className="cell"><CalendarClock className="header-icon" /> Due</div>
                {isLargeScreen() && (
                    <div className="cell"><CalendarPlus className="header-icon" /> Start</div>
                )}
                {isLargeScreen() && (
                    <div className="cell"><Repeat className="header-icon" /> Recurrences</div>
                )}
            </div>
            {roots.map((root) => renderNode(root, 0, "commitment"))}
        </div>

        {/* Reference list — not rendered as a table here, just exposed as data. */}
        {/* {childlessProjects} */}
    </div>);
}
