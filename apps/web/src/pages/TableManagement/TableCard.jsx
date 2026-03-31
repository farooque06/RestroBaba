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
                        <Users size={14} strokeWidth={2.5} />
                        <span>Seats {table.capacity}</span>
                        {table.status === 'Occupied' && table.activeOrderCreatedAt && (
                            <div className="tm-card-timer animate-pulse-gentle">
                                <Clock size={12} strokeWidth={3} />
                                <span>
                                    {Math.floor((currentTime - new Date(table.activeOrderCreatedAt)) / (1000 * 60))}m
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="tm-card-icons">
                    <button 
                        onClick={() => onQrClick(table)} 
                        className="tm-card-icon-btn" 
                        title="QR Code"
                    >
                        <QrCode size={18} strokeWidth={2.5} />
                    </button>
                    {table.status === 'Occupied' && (
                        <button 
                            onClick={() => onTransferClick(table)} 
                            className="tm-card-icon-btn" 
                            title="Transfer Guest"
                        >
                            <MoveHorizontal size={18} strokeWidth={2.5} />
                        </button>
                    )}
                    <button 
                        onClick={() => onDeleteClick(table.id)} 
                        className="tm-card-icon-btn danger" 
                        title="Delete"
                    >
                        <Trash2 size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Status */}
            <div className="tm-card-status">
                <span className={`status-dot ${table.status === 'Available' ? 'green' : table.status === 'Occupied' ? 'blue' : 'amber'}`} />
                <span style={{ fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    {table.status === 'Available' ? 'Ready & Available' : table.status === 'Occupied' ? 'Active Table' : 'Reserved'}
                </span>
            </div>

            {/* Actions */}
            <div className="tm-card-actions">
                {table.status === 'Available' ? (
                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%', alignItems: 'center' }}>
                        <button
                            onClick={() => onSelectTable(table)}
                            className="tm-action-btn seat"
                            style={{ flex: 1 }}
                        >
                            <Utensils size={18} />
                            <span>Take Order</span>
                        </button>
                        <button
                            onClick={() => onToggleReservation(table)}
                            className="tm-action-btn view"
                            title="Reserve"
                            style={{ flex: '0 0 48px', padding: 0 }}
                        >
                            <Calendar size={18} />
                        </button>
                    </div>
                ) : table.status === 'Reserved' ? (
                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%', alignItems: 'center' }}>
                        <button
                            onClick={() => onSelectTable(table)}
                            className="tm-action-btn seat"
                            style={{ flex: 1 }}
                        >
                            <Utensils size={18} />
                            <span>Arrived</span>
                        </button>
                        <button
                            onClick={() => onToggleReservation(table)}
                            className="tm-action-btn view"
                            title="Cancel Reservation"
                            style={{ flex: '0 0 48px', padding: 0, color: '#ef4444' }}
                        >
                            <CalendarX size={18} />
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => onSelectTable(table)}
                            className="tm-action-btn view"
                        >
                            <Edit2 size={16} />
                            <span>Modify</span>
                        </button>
                        <button
                            onClick={() => onHandleBill(table)}
                            className="tm-action-btn bill"
                        >
                            <DollarSign size={18} />
                            <span>Checkout</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default TableCard;
