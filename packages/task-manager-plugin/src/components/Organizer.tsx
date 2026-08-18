import { CalendarClock, CalendarPlus, CircleCheck, FileText, Flag, Repeat } from "lucide-react";
import { Commitment } from "@personal-os/obsidian/dist/services/CommitmentsProvider";
import { useContext } from "react";
import { ObsidianContext } from "@/context/ObsidianContext";
import { CommitmentRow } from "@/components/CommitmentRow";

export default function Organizer() {
    const { ctx } = useContext(ObsidianContext)!;

    const commitments: readonly Commitment[] = ctx.commitments.getAllCommitmentsSnapshot();

    return (<div className="tm-organizer">
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
                commitments.map((commitment) => (
                    <CommitmentRow
                        key={commitment.file.path}
                        commitment={commitment}
                    />
                ))
            }
        </div>
    </div>)
}
