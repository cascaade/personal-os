import {
    ALargeSmall,
    CalendarClock,
    CalendarPlus, ChevronDown,
    ChevronsDown,
    CircleCheck,
    CircleDot,
    FileText,
    Flag,
    Repeat
} from "lucide-react";

export default function Organizer() {

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

            <div className="row">
                <div className="cell">
                    <span className="custom-inner-input" contentEditable suppressContentEditableWarning></span>
                </div>
                <div className="cell">
                    <select>
                        <option value="not-started">not started</option>
                        <option value="blocked">blocked</option>
                        <option value="in-progress">in progress</option>
                        <option value="suspended">suspended</option>
                        <option value="done">done</option>
                    </select>
                </div>
                <div className="cell">
                    <select>
                        <option value="lowest">lowest</option>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                        <option value="highest">highest</option>
                    </select>
                </div>
                <div className="cell"><input type="datetime-local" /></div>
                <div className="cell"><input type="datetime-local" /></div>
                <div className="cell">
                    <span className="custom-inner-input" contentEditable suppressContentEditableWarning></span>
                </div>
            </div>
        </div>
    </div>)
}
