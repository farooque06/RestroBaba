import React from 'react';
import { CheckCircle2, UserCheck, CalendarDays } from 'lucide-react';

const SummaryStats = ({ availCount, occCount, resCount }) => {
    return (
        <div className="tm-summary-bar">
        <div className="tm-stat-pill available">
            <div className="stat-icon-wrapper">
                <CheckCircle2 size={24} strokeWidth={2.5} />
            </div>
            <div className="stat-info">
                <div className="count">{availCount}</div>
                <div className="label">Available</div>
            </div>
        </div>

        <div className="tm-stat-pill occupied">
            <div className="stat-icon-wrapper">
                <UserCheck size={24} strokeWidth={2.5} />
            </div>
            <div className="stat-info">
                <div className="count">{occCount}</div>
                <div className="label">Occupied</div>
            </div>
        </div>

        <div className="tm-stat-pill reserved">
            <div className="stat-icon-wrapper">
                <CalendarDays size={24} strokeWidth={2.5} />
            </div>
            <div className="stat-info">
                <div className="count">{resCount}</div>
                <div className="label">Reserved</div>
            </div>
        </div>
        </div>
    );
};

export default SummaryStats;
