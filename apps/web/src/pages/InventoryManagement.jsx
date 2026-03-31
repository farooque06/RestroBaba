import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';
import { Package, Plus, Search, AlertTriangle, ArrowRight, History, Loader2, Edit2, Trash2, Save, X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import Dropdown from '../components/common/Dropdown';

const InventoryManagement = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedItemHistory, setSelectedItemHistory] = useState([]);
    const [formData, setFormData] = useState({ name: '', unit: '', quantity: '', minThreshold: '', unitPrice: '' });
    const [adjustData, setAdjustData] = useState({ type: 'IN', quantity: '', reason: '' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setInventory(data);
        } catch (err) {
            console.error('Failed to fetch inventory', err);
        } finally {
            setLoading(false);
        }
    };

    const [historyHasMore, setHistoryHasMore] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [fetchingHistoryMore, setFetchingHistoryMore] = useState(false);
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');

    const fetchHistory = async (itemId, pageNum = 1, initial = false) => {
        if (!initial) setFetchingHistoryMore(true);
        const token = localStorage.getItem('restroToken');
        try {
            let url = `${API_BASE_URL}/api/activity/inventory?itemId=${itemId}&page=${pageNum}&limit=20`;
            if (historyStartDate) url += `&startDate=${historyStartDate}`;
            if (historyEndDate) url += `&endDate=${historyEndDate}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (initial) {
                setSelectedItemHistory(data.transactions);
            } else {
                setSelectedItemHistory(prev => [...prev, ...data.transactions]);
            }
            setHistoryHasMore(data.pagination.hasMore);
            setHistoryPage(data.pagination.page);
        } catch (err) {
            console.error('Failed to fetch history', err);
        } finally {
            setFetchingHistoryMore(false);
        }
    };

    useEffect(() => {
        if (isHistoryOpen && editingItem) {
            fetchHistory(editingItem.id, 1, true);
        }
    }, [historyStartDate, historyEndDate]);

    const loadMoreHistory = () => {
        if (!fetchingHistoryMore && historyHasMore) {
            fetchHistory(editingItem.id, historyPage + 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('restroToken');
        const url = editingItem ? `${API_BASE_URL}/api/inventory/${editingItem.id}` : `${API_BASE_URL}/api/inventory`;
        const method = editingItem ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                fetchInventory();
                setIsModalOpen(false);
                setEditingItem(null);
                setFormData({ name: '', unit: '', quantity: '', minThreshold: '', unitPrice: '' });
                toast.success(editingItem ? 'Item updated' : 'Item added');
            }
        } catch (err) {
            toast.error('Failed to save item');
        }
    };

    const handleAdjustment = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/${editingItem.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    adjustType: adjustData.type,
                    adjustQuantity: adjustData.quantity,
                    reason: adjustData.reason
                })
            });

            if (response.ok) {
                fetchInventory();
                setIsAdjustModalOpen(false);
                setAdjustData({ type: 'IN', quantity: '', reason: 'Manual Adjustment' });
                toast.success('Stock adjusted successfully');
            }
        } catch (err) {
            toast.error('Failed to adjust stock');
        }
    };

    const handleDelete = (id) => {
        setConfirmAction({
            title: 'Delete Stock Item?',
            message: 'Are you sure you want to permanently delete this inventory item? This action cannot be undone.',
            onConfirm: () => performDelete(id)
        });
        setIsConfirmModalOpen(true);
    };

    const performDelete = async (id) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchInventory();
                toast.success('Item deleted');
            }
        } catch (err) {
            toast.error('Failed to delete item');
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            unit: item.unit,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString()
        });
        setIsModalOpen(true);
    };

    const openAdjust = (item) => {
        setEditingItem(item);
        setIsAdjustModalOpen(true);
    };

    const openHistory = (item) => {
        setEditingItem(item);
        fetchHistory(item.id, 1, true);
        setIsHistoryOpen(true);
    };

    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const lowStockItems = inventory.filter(item => item.quantity <= item.minThreshold);

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div className="page-header">
                <div className="page-header-info">
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Inventory Tracking</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage stock levels and raw materials.</p>
                </div>
                <div className="page-header-actions">
                    <button
                        onClick={() => { setEditingItem(null); setFormData({ name: '', unit: '', quantity: '', minThreshold: '', unitPrice: '' }); setIsModalOpen(true); }}
                        className="btn-primary"
                    >
                        <Plus size={20} />
                        <span>Add Stock</span>
                    </button>
                </div>
            </div>

            {lowStockItems.length > 0 && (
                <div className="premium-glass" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <AlertTriangle color="var(--danger)" size={24} />
                    <div>
                        <h4 style={{ color: 'var(--danger)', marginBottom: '0.25rem' }}>Low Stock Alert</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {lowStockItems.length} items are below their minimum threshold.
                        </p>
                    </div>
                </div>
            )}

            <div className="premium-glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div className="search-bar" style={{ maxWidth: '400px' }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search stock items..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="premium-glass" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Current Stock</th>
                            <th>Unit</th>
                            <th>Min. Threshold</th>
                            <th>Unit Cost</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInventory.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                                <td>{item.name}</td>
                                <td style={{ fontSize: '1.1rem', fontWeight: 700, color: item.quantity <= item.minThreshold ? 'var(--danger)' : 'var(--text-main)' }}>
                                    {item.quantity.toFixed(2)}
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>{item.unit}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{item.minThreshold} {item.unit}</td>
                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>Rs. {item.unitPrice.toFixed(2)}</td>
                                <td>
                                    <span className={`badge badge-${item.quantity <= item.minThreshold ? 'danger' : 'success'}`}>
                                        {item.quantity <= item.minThreshold ? 'Low Stock' : 'Healthy'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => openAdjust(item)} className="icon-button" title="Adjust Stock">
                                            <ArrowUpRight size={16} />
                                        </button>
                                        <button onClick={() => openHistory(item)} className="icon-button" title="View History">
                                            <History size={16} />
                                        </button>
                                        <button onClick={() => openEdit(item)} className="icon-button" title="Edit Item">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="icon-button danger" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredInventory.length === 0 && (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Package size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                        <p>No inventory items found.</p>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>{editingItem ? 'Edit Item Details' : 'Add New Item'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="input-group">
                                <label>Item Name (e.g., Chicken Breast, Flour)</label>
                                <input
                                    className="auth-input"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Initial Quantity</label>
                                    <input
                                        className="auth-input"
                                        type="number"
                                        step="0.01"
                                        required
                                        disabled={!!editingItem}
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                    />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Unit (kg, g, l, pcs)</label>
                                    <input
                                        className="auth-input"
                                        placeholder="kg"
                                        required
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Min. Threshold Alert</label>
                                    <input
                                        className="auth-input"
                                        type="number"
                                        required
                                        value={formData.minThreshold}
                                        onChange={e => setFormData({ ...formData, minThreshold: e.target.value })}
                                    />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Unit Cost (per {formData.unit || 'unit'})</label>
                                    <input
                                        className="auth-input"
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.unitPrice}
                                        onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="nav-item active" style={{ padding: '0.8rem', borderRadius: '10px', border: 'none', cursor: 'pointer', marginTop: '1rem' }}>
                                {editingItem ? 'Save Changes' : 'Create Item'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Adjust Stock Modal */}
            {isAdjustModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '400px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ marginBottom: '0.25rem' }}>Adjust Stock</h2>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{editingItem?.name} (Current: {editingItem?.quantity} {editingItem?.unit})</p>
                                </div>
                                <button onClick={() => setIsAdjustModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div className="input-group">
                                    <label>Adjustment Type</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setAdjustData({ ...adjustData, type: 'IN' })}
                                            style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: adjustData.type === 'IN' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: adjustData.type === 'IN' ? '#10b981' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Stock IN (+)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAdjustData({ ...adjustData, type: 'OUT' })}
                                            style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: adjustData.type === 'OUT' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: adjustData.type === 'OUT' ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Stock OUT (-)
                                        </button>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Quantity to {adjustData.type === 'IN' ? 'Add' : 'Remove'}</label>
                                    <input
                                        className="auth-input"
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={adjustData.quantity}
                                        onChange={e => setAdjustData({ ...adjustData, quantity: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <Dropdown 
                                        label="Reason & Category"
                                        options={[
                                            { value: 'Manual Adjustment', label: 'Standard Adjustment' },
                                            { value: 'Purchase', label: 'New Purchase / Refill' },
                                            { value: 'Spoilage', label: 'Waste: Spoilage / Expired' },
                                            { value: 'Spillage', label: 'Waste: Spillage / Damage' },
                                            { value: 'Kitchen Error', label: 'Waste: Kitchen Error' },
                                            { value: 'Complimentary', label: 'Promo: Complimentary / Freebie' },
                                            { value: 'Correction', label: 'Inventory Correction' },
                                        ]}
                                        value={adjustData.reason}
                                        onChange={val => setAdjustData({ ...adjustData, reason: val })}
                                    />
                                </div>

                                {adjustData.reason.includes('Waste') || ['Spoilage', 'Spillage', 'Kitchen Error'].includes(adjustData.reason) ? (
                                    <div style={{
                                        padding: '1rem',
                                        background: 'rgba(239, 68, 68, 0.05)',
                                        borderRadius: '10px',
                                        border: '1px dashed rgba(239, 68, 68, 0.2)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>Calculated Loss:</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--danger)' }}>
                                            Rs. {(parseFloat(adjustData.quantity || 0) * (editingItem?.unitPrice || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                ) : null}
                                <button type="submit" className="nav-item active" style={{ padding: '0.8rem', borderRadius: '10px', border: 'none', cursor: 'pointer', marginTop: '1rem' }}>
                                    Apply Adjustment
                                </button>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* History Modal */}
            {isHistoryOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'flex-end', zIndex: 2000 }}>
                    <div className="animate-slide-in" style={{ width: '450px', height: '100%', background: 'var(--bg-card)', padding: '2rem', overflowY: 'auto', borderLeft: '1px solid var(--glass-border)', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Transaction History</h2>
                                    <p style={{ color: 'var(--text-muted)' }}>{editingItem?.name}</p>
                                </div>
                                <button onClick={() => setIsHistoryOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '0.5rem', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <div className="premium-glass" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter by Date</span>
                                    {(historyStartDate || historyEndDate) && (
                                        <button
                                            onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="date"
                                        className="premium-glass"
                                        value={historyStartDate}
                                        onChange={e => setHistoryStartDate(e.target.value)}
                                        style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                                    />
                                    <input
                                        type="date"
                                        className="premium-glass"
                                        value={historyEndDate}
                                        onChange={e => setHistoryEndDate(e.target.value)}
                                        style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {selectedItemHistory.map(transaction => (
                                    <div key={transaction.id} className="premium-glass" style={{ padding: '1.25rem', display: 'flex', gap: '1rem' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '12px',
                                            background: transaction.type === 'IN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: transaction.type === 'IN' ? '#10b981' : 'var(--danger)'
                                        }}>
                                            {transaction.type === 'IN' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                                                    {transaction.type === 'IN' ? '+' : '-'}{transaction.quantity} {editingItem?.unit}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{transaction.reason || 'No reason provided'}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--glass-shine)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {transaction.type.replace('_', ' ')} by {transaction.user?.name || 'System'}
                                                </span>
                                                {transaction.orderId && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Order #{transaction.orderId.slice(-4).toUpperCase()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {historyHasMore && (
                                    <button
                                        onClick={loadMoreHistory}
                                        disabled={fetchingHistoryMore}
                                        className="premium-glass"
                                        style={{
                                            width: '100%',
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--primary)',
                                            color: 'var(--primary)',
                                            fontWeight: 700,
                                            cursor: fetchingHistoryMore ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            marginTop: '1rem'
                                        }}
                                    >
                                        {fetchingHistoryMore ? <Loader2 className="animate-spin" size={18} /> : <History size={18} />}
                                        {fetchingHistoryMore ? 'Loading...' : 'Load Older Transactions'}
                                    </button>
                                )}

                                {selectedItemHistory.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                        <History size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                        <p>No transactions recorded for this item.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmAction.onConfirm}
                title={confirmAction.title}
                message={confirmAction.message}
                variant="danger"
            />
        </div>
    );
};

export default InventoryManagement;
