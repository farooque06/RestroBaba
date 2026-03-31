import React from 'react';
import { TableProperties } from 'lucide-react';
import TableCard from './TableCard';

const TableGrid = ({ 
    tables, 
    currentTime, 
    filter, 
    onQrClick, 
    onTransferClick, 
    onDeleteClick, 
    onSelectTable, 
    onToggleReservation, 
    onHandleBill 
}) => {
    if (tables.length === 0) {
        return (
            <div className="tm-empty">
                <TableProperties size={56} style={{ opacity: 0.2 }} />
                <p>{filter === 'All' ? 'No tables yet. Add your first table.' : `No ${filter.toLowerCase()} tables right now.`}</p>
            </div>
        );
    }

    return (
        <div className="tm-grid">
            {tables.map((table, idx) => (
                <TableCard
                    key={table.id}
                    table={table}
                    idx={idx}
                    currentTime={currentTime}
                    onQrClick={onQrClick}
                    onTransferClick={onTransferClick}
                    onDeleteClick={onDeleteClick}
                    onSelectTable={onSelectTable}
                    onToggleReservation={onToggleReservation}
                    onHandleBill={onHandleBill}
                />
            ))}
        </div>
    );
};

export default TableGrid;
