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
            {/* ── Card Header ── */}
            <div className="tm-card-top">
                <div>
                    <div className="tm-card-title">Table {table.number}</div>
                    <div className="tm-card-capacity">
                        <Users size={14} strokeWidth={2.5} />
                        <span>Seats {table.capacity}</span>
                        {table.status === 'Occupied' && table.activeOrderCreatedAt && (
                            <div className="tm-card-timer">
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
                        onClick={(e) => { e.stopPropagation(); onQrClick(table); }} 
                        className="tm-card-icon-btn" 
                        title="Scanner QR"
                    >
                        <QrCode size={16} strokeWidth={2.5} />
                    </button>
                    {table.status === 'Occupied' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onTransferClick(table); }} 
                            className="tm-card-icon-btn" 
                        >
                            <MoveHorizontal size={16} strokeWidth={2.5} />
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(table.id); }} 
                        className="tm-card-icon-btn danger" 
                    >
                        <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* ── Status Indicator ── */}
            <div className="tm-card-status">
                <span className={`status-dot ${table.status === 'Available' ? 'green' : table.status === 'Occupied' ? 'blue' : 'amber'}`} />
                <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-main)' }}>
                    {table.status === 'Available' ? 'Ready & Available' : table.status === 'Occupied' ? 'Active Guests' : 'Reserved Slot'}
                </span>
            </div>

            {/* ── Actions ── */}
            <div className="tm-card-actions">
                {table.status === 'Available' ? (
                    <>
                        <button
                            onClick={() => onSelectTable(table)}
                            className="tm-action-btn seat"
                            style={{ flex: 3 }}
                        >
                            <Utensils size={16} strokeWidth={2.5} />
                            <span className="btn-text">Order</span>
                        </button>
                        <button
                            onClick={() => onToggleReservation(table)}
                            className="tm-action-btn view"
                            style={{ flex: 1 }}
                        >
                            <Calendar size={16} strokeWidth={2.5} />
                        </button>
                    </>
                ) : table.status === 'Reserved' ? (
                    <>
                        <button
                            onClick={() => onSelectTable(table)}
                            className="tm-action-btn seat"
                            style={{ flex: 3 }}
                        >
                            <Users size={16} strokeWidth={2.5} />
                            <span className="btn-text">Arrive</span>
                        </button>
                        <button
                            onClick={() => onToggleReservation(table)}
                            className="tm-action-btn view"
                            style={{ flex: 1, color: '#ef4444' }}
                        >
                            <CalendarX size={16} strokeWidth={2.5} />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => onSelectTable(table)}
                            className="tm-action-btn view"
                            style={{ flex: 1 }}
                        >
                            <Edit2 size={16} strokeWidth={2.5} />
                            <span className="btn-text">Edit</span>
                        </button>
                        <button
                            onClick={() => onHandleBill(table)}
                            className="tm-action-btn bill"
                            style={{ flex: 1 }}
                        >
                            <DollarSign size={16} strokeWidth={3} />
                            <span className="btn-text">Bill</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default TableCard;
