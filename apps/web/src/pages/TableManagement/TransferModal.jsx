import React from 'react';
import { createPortal } from 'react-dom';
import { X, Users, MoveHorizontal } from 'lucide-react';

const TransferModal = ({ isOpen, onClose, tables, tableToTransfer, onTransfer }) => {
    if (!isOpen || !tableToTransfer) return null;

    // Filter available and reserved tables for transfer (excluding the one we're transferring from)
    const availableTables = tables.filter(t => ['Available', 'Reserved'].includes(t.status) && t.id !== tableToTransfer.id);

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ width: '100%', maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <MoveHorizontal size={20} color="var(--primary)" />
                        Shift Table {tableToTransfer.number}
                    </h2>
                    <button onClick={onClose} className="icon-button"><X size={20} /></button>
                </div>

                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Move guest and active order to an available or reserved table:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', padding: '0.25rem' }}>
                    {availableTables.length === 0 ? (
                        <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '2rem', color: 'var(--text-muted)' }}>
                            No available tables to shift to.
                        </div>
                    ) : (
                        availableTables.map(table => (
                            <button
                                key={table.id}
                                onClick={() => onTransfer(table)}
                                className="tm-chip"
                                style={{
                                    width: '100%',
                                    height: '60px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    background: table.status === 'Reserved' ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-input)',
                                    border: `1px solid ${table.status === 'Reserved' ? 'var(--warning)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    margin: 0,
                                    position: 'relative'
                                }}
                            >
                                <span style={{ fontWeight: 800, fontSize: '1rem' }}>{table.number}</span>
                                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{table.status === 'Reserved' ? 'Reserved' : `Cap: ${table.capacity}`}</span>
                            </button>
                        ))
                    )}
                </div>
                
                <div style={{ marginTop: '1.5rem' }}>
                    <button onClick={onClose} className="btn-ghost" style={{ width: '100%' }}>Cancel</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TransferModal;
