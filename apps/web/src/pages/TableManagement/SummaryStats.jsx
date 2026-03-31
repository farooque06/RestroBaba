import React from 'react';

const SummaryStats = ({ availCount, occCount, resCount }) => {
    return (
        <div className="tm-summary-bar">
            <div className="tm-stat-pill available">
                <span className="count">{availCount}</span>
                <span className="label">Available</span>
            </div>
            <div className="tm-stat-pill occupied">
                <span className="count">{occCount}</span>
                <span className="label">Occupied</span>
            </div>
            <div className="tm-stat-pill reserved">
                <span className="count">{resCount}</span>
                <span className="label">Reserved</span>
            </div>
        </div>
    );
};

export default SummaryStats;
