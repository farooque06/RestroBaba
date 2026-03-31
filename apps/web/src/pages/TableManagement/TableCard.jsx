import React from 'react';
import { Users, Clock, QrCode, MoveHorizontal, Trash2, Utensils, Calendar, CalendarX, Edit2, DollarSign } from 'lucide-react';

const TableCard = ({ 
    table, 
    currentTime, 
    onQrClick, 
    onTransferClick, 
    onDeleteClick, 
    onSelectTable, 
    onToggleReservation, 
    onHandleBill,
    idx
}) => {
    return (
        <div
            className={`tm-card status-${table.status.toLowerCase()}`}
            style={{ animationDelay: `${idx * 0.05}s` }}
        >
            {/* Card top */}
            <div className="tm-card-top">
                <div>
                    <div className="tm-card-title">Table {table.number}</div>
                    <div className="tm-card-capacity">
                        <Users size={13} />
                        <span>Capacity {table.capacity}</span>
                    </div>
                    {table.status === 'Occupied' && table.activeOrderCreatedAt && (
                        <div className="tm-card-timer animate-pulse-gentle">
                            <Clock size={12} />
                            <span>
                                {Math.floor((currentTime - new Date(table.activeOrderCreatedAt)) / (1000 * 60))}m
                            </span>
                        </div>
                    )}
                </div>
                <div className="tm-card-icons">
                    <button 
                        onClick={() => onQrClick(table)} 
                        className="tm-card-icon-btn" 
                        title="QR Code"
                    >
                        <QrCode size={15} />
                    </button>
                    {table.status === 'Occupied' && (
                        <button 
                            onClick={() => onTransferClick(table)} 
                            className="tm-card-icon-btn" 
                            title="Transfer Guest"
                        >
                            <MoveHorizontal size={15} />
                        </button>
                    )}
                    <button 
                        onClick={() => onDeleteClick(table.id)} 
                        className="tm-card-icon-btn danger" 
                        title="Delete"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Status */}
            <div className="tm-card-status">
                <span className={`status-dot ${table.status === 'Available' ? 'green' : table.status === 'Occupied' ? 'blue' : 'amber'}`} />
                <span>{table.status === 'Available' ? 'Ready — Available now' : table.status === 'Occupied' ? 'In Use' : 'Reserved'}</span>
            </div>

            {/* Actions */}
            <div className="tm-card-actions">
                {table.status === 'Available' ? (
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                        <button
                            onClick={() => onSelectTable(table)}
                            className="tm-action-btn seat"
                            style={{ flex: 1 }}
                        >
                            <Utensils size={15} />
                            <span>Seat Guest</span>
                        </button>
                        <button
                            onClick={() => onToggleReservation(table)}
                            className="tm-action-btn view"
                            title="Reserve Table"
                            style={{ 
                                flex: '0 0 40px', 
                                height: '40px', 
                                padding: 0, 
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <Calendar size={16} />
                        </button>
                    </div>
                ) : table.status === 'Reserved' ? (
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                        <button
                            onClick={() => onSelectTable(table)}
                            className="tm-action-btn seat"
                            style={{ flex: 1 }}
                        >
                            <Utensils size={15} />
                            <span>Seat Guest</span>
                        </button>
                        <button
                            onClick={() => onToggleReservation(table)}
                            className="tm-action-btn bill"
                            title="Cancel Reservation"
                            style={{ 
                                flex: '0 0 40px', 
                                height: '40px', 
                                padding: 0, 
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--warning)',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-input)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <CalendarX size={16} />
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => onSelectTable(table)}
                            className="tm-action-btn view"
                        >
                            <Edit2 size={15} />
                            <span>View Order</span>
                        </button>
                        <button
                            onClick={() => onHandleBill(table)}
                            className="tm-action-btn bill"
                        >
                            <DollarSign size={15} />
                            <span>Bill</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default TableCard;
