import { Commitment } from "@/services/CommitmentsProvider";
import { memo } from "react";

function CommitmentEl({ commitment }: { commitment: Commitment }) {
    return ( <div className="task-commitment">
        { commitment.title }
    </div> )
}

export default memo(CommitmentEl);
