import React from 'react';
import { CheckCircle2, UserCheck, CalendarDays } from 'lucide-react';

const SummaryStats = ({ availCount, occCount, resCount }) => {
    return (
        <div className="tm-summary-bar">
            {/* Available */}
            <div className="tm-stat-pill available">
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '12px' }}>
                    <CheckCircle2 size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <div className="count">{availCount}</div>
                    <div className="label">Available Tables</div>
                </div>
            </div>

            {/* Occupied */}
            <div className="tm-stat-pill occupied">
                <div style={{ background: 'rgba(212, 175, 55, 0.1)', color: '#d4a853', padding: '10px', borderRadius: '12px' }}>
                    <UserCheck size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <div className="count">{occCount}</div>
                    <div className="label">Occupied Now</div>
                </div>
            </div>

            {/* Reserved */}
            <div className="tm-stat-pill reserved">
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '10px', borderRadius: '12px' }}>
                    <CalendarDays size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <div className="count">{resCount}</div>
                    <div className="label">Reserved Seats</div>
                </div>
            </div>
        </div>
    );
};

export default SummaryStats;
