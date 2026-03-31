import React from 'react';

const FilterBar = ({ filter, setFilter }) => {
    const statuses = ['All', 'Available', 'Occupied', 'Reserved'];

    return (
        <div className="tm-filters" style={{ marginBottom: '1.25rem' }}>
            {statuses.map((status) => (
                <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`tm-chip${filter === status ? ' active' : ''}`}
                >
                    {status}
                </button>
            ))}
        </div>
    );
};

export default FilterBar;
