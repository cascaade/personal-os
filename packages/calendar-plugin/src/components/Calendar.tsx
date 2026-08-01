import { createContext } from "react";
import Day from "@/components/Day";

export function Calendar() {
    return (
        <div className="calendar-view">
            <div className="calendar-header">
                <div className="calendar-banner">
                    <div className="calendar-month">
                        June 2026
                    </div>
                    <div className="calendar-options">

                    </div>
                </div>
                <div className="calendar-labels">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(item => (
                        <div className="calendar-label" key={item}>{ item }</div>
                    ))}
                </div>
            </div>
            <div className="calendar-table">
                {
                    (() => {
                        let x = [];
                        for (let i = 0; i < 504; i++) {
                            x.push(<Day day={i} />);
                        }
                        return x;
                    })()
                }
            </div>
        </div>
    );
}
