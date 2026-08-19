import { CalendarClock, CalendarPlus, CircleCheck, FileText, Flag, Repeat, History, ListTodo } from "lucide-react";
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { Fragment, useContext, useMemo, useState } from "react";
import { CommitmentRow } from "@/components/CommitmentRow";
import { buildCommitmentTree, CommitmentTreeNode, sortTree } from "@/utils/commitmentTree";
import { ObsidianContext } from "@/context/ObsidianContext";

type ViewMode = "upcoming" | "past";

interface OrganizerProps {
    commitments: readonly Commitment[];
}

export default function Organizer({ commitments }: OrganizerProps) {
    const { ctx } = useContext(ObsidianContext)!;
    const [viewMode, setViewMode] = useState<ViewMode>("upcoming");

    const { roots, childlessRoots } = useMemo(() => {
        const tree = buildCommitmentTree(commitments, ctx.commitments);
        const newestFirst = viewMode === "past";
        return {
            roots: sortTree(tree.roots, newestFirst),
            childlessRoots: sortTree(tree.childlessRoots, newestFirst),
        };
    }, [commitments, ctx.commitments, viewMode]);

    const renderNode = (node: CommitmentTreeNode, depth: number) => (
        <Fragment key={node.commitment.file.path}>
            <CommitmentRow commitment={node.commitment} depth={depth} error={node.error} />
            {node.children.map((child) => renderNode(child, depth + 1))}
        </Fragment>
    );

    return (<div className="tm-organizer">
        <div className="table-header">
            <h2>{ viewMode == "upcoming" ? "Upcoming" : "Past" } Tasks ({roots.length})</h2>
            <div className="tm-toggle">
                <button className={viewMode === "upcoming" ? "active" : ""} onClick={() => setViewMode("upcoming")}>
                    <ListTodo className="header-icon" /> Upcoming
                </button>
                <button className={viewMode === "past" ? "active" : ""} onClick={() => setViewMode("past")}>
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
            {roots.map((root) => renderNode(root, 0))}
            {childlessRoots.map((node) => (
                <CommitmentRow key={node.commitment.file.path} commitment={node.commitment} depth={0} error={node.error} />
            ))}
        </div>
    </div>);
}
