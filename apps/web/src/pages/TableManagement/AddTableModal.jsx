import React from 'react';
import { createPortal } from 'react-dom';

const AddTableModal = ({ isOpen, onClose, onSubmit, newTable, setNewTable }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Add New Table</h2>
                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Table Number</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="e.g. 1 or F1-T1"
                            value={newTable.number}
                            onChange={(e) => setNewTable({ ...newTable, number: e.target.value })}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Capacity</label>
                        <input
                            className="form-input"
                            type="number"
                            placeholder="e.g. 4"
                            value={newTable.capacity}
                            onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Table</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AddTableModal;
