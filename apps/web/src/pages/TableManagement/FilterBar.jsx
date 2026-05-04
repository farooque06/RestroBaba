import React from 'react';
import { Layers, CheckCircle2, UserCheck, CalendarDays } from 'lucide-react';

const FilterBar = ({ filter, setFilter }) => {
    const statuses = [
        { id: 'All', label: 'All Tables', icon: Layers },
        { id: 'Available', label: 'Available', icon: CheckCircle2 },
        { id: 'Occupied', label: 'Occupied', icon: UserCheck },
        { id: 'Reserved', label: 'Reserved', icon: CalendarDays },
    ];

    return (
        <div className="tm-filters-container">
            <div className="tm-filters">
                {statuses.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setFilter(id)}
                        className={`tm-filter-item ${id.toLowerCase()} ${filter === id ? 'active' : ''}`}
                    >
                        <Icon size={18} strokeWidth={filter === id ? 2.5 : 2} />
                        <span>{label}</span>
                        {filter === id && <span className="active-dot" />}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FilterBar;
