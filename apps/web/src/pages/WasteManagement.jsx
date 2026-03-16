import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';
import {
    Trash2,
    Plus,
    History,
    AlertTriangle,
    TrendingDown,
    Search,
    Loader2,
    X,
    Filter,
    ArrowDownRight,
    Calendar,
    DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';

const WasteManagement = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [inventory, setInventory] = useState([]);
    const [wasteLogs, setWasteLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalLoss: 0, topItem: 'N/A', wastePercent: 0 });

    // Logging Form State
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [logData, setLogData] = useState({ quantity: '', reason: 'Spoilage' });

    // History Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([
            fetchInventory(),
            fetchWasteLogs(1, true),
            isAdmin ? fetchStats() : Promise.resolve()
        ]);
        setLoading(false);
    };

    const fetchInventory = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/inventory`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setInventory(await res.json());
        } catch (err) {
            console.error('Failed to fetch inventory', err);
        }
    };

    const fetchWasteLogs = async (pageNum = 1, initial = false) => {
        const token = localStorage.getItem('restroToken');
        try {
            let url = `${API_BASE_URL}/api/activity/inventory?page=${pageNum}&limit=15&type=OUT`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;

            // Note: Our modified backend filters for 'reason' if we want specific waste reasons, 
            // but for now we fetch all OUT and filter client-side for waste reasons if needed, 
            // OR we can pass a specific waste flag if we modify backend further.
            // Let's assume we want to see anything that is marked as a waste reason.

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            // Filter for waste-related reasons client-side to be sure
            const wasteReasons = ['Spoilage', 'Spillage', 'Kitchen Error', 'Waste: Spoilage / Expired', 'Waste: Spillage / Damage', 'Waste: Kitchen Error'];
            const wasteTransactions = data.transactions.filter(t =>
                wasteReasons.includes(t.reason) || t.type === 'WASTE'
            );

            if (initial) {
                setWasteLogs(wasteTransactions);
            } else {
                setWasteLogs(prev => [...prev, ...wasteTransactions]);
            }
            setHasMore(data.pagination.hasMore);
            setPage(data.pagination.page);
        } catch (err) {
            console.error('Failed to fetch waste logs', err);
        }
    };

    const fetchStats = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/profit`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setStats({
                    totalLoss: data.waste?.totalLoss || 0,
                    topItem: data.items?.find(i => i.waste > 0)?.name || 'N/A', // Assuming backend might provide this
                    wastePercent: ((data.waste?.totalLoss || 0) / (data.summary?.totalRevenue || 1) * 100).toFixed(1)
                });
            }
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    };

    const handleLogWaste = async (e) => {
        e.preventDefault();
        if (!selectedItem) return toast.error('Pick an item');

        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/inventory/${selectedItem.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    adjustType: 'OUT',
                    adjustQuantity: logData.quantity,
                    reason: logData.reason
                })
            });

            if (res.ok) {
                toast.success('Waste logged successfully');
                setIsLogModalOpen(false);
                setSelectedItem(null);
                setLogData({ quantity: '', reason: 'Spoilage' });
                fetchWasteLogs(1, true);
                if (isAdmin) fetchStats();
            }
        } catch (err) {
            toast.error('Failed to log waste');
        }
    };

    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Trash2 color="var(--danger)" /> Waste Management
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Track and analyze restaurant losses for better profitability.</p>
                </div>
                <button
                    onClick={() => setIsLogModalOpen(true)}
                    className="nav-item active"
                    style={{ border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
                >
                    <Plus size={20} />
                    <span>Report Waste</span>
                </button>
            </div>

            {isAdmin && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                                <TrendingDown color="var(--danger)" size={24} />
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Loss (Period)</span>
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--danger)' }}>{formatCurrency(stats.totalLoss)}</h2>
                    </div>

                    <div className="stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                                <AlertTriangle color="#3b82f6" size={24} />
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Waste Impact</span>
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>{stats.wastePercent}%</h2>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>of total revenue lost</p>
                    </div>

                    <div className="stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                                <Calendar color="#8b5cf6" size={24} />
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Top Waste Factor</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Spoilage</h2>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Leading cause of loss</p>
                    </div>
                </div>
            )}

            <div className="premium-glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <History size={20} color="var(--primary)" />
                        {isAdmin ? 'All Waste Transactions' : 'My Reported Waste'}
                    </h3>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Calendar size={16} color="var(--text-muted)" />
                            <input
                                type="date"
                                className="auth-input"
                                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                            <input
                                type="date"
                                className="auth-input"
                                style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => fetchWasteLogs(1, true)}
                            style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Filter
                        </button>
                    </div>
                </div>
            </div>

            <div className="premium-glass" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--glass-shine)', borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '1.25rem' }}>Date & Time</th>
                            <th style={{ padding: '1.25rem' }}>Item</th>
                            <th style={{ padding: '1.25rem' }}>Quantity</th>
                            <th style={{ padding: '1.25rem' }}>Reason</th>
                            {isAdmin && <th style={{ padding: '1.25rem' }}>Loss Value</th>}
                            {isAdmin && <th style={{ padding: '1.25rem' }}>Staff</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {wasteLogs.map(log => (
                            <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '1.25rem', fontSize: '0.9rem' }}>
                                    {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td style={{ padding: '1.25rem', fontWeight: 600 }}>{log.inventoryItem.name}</td>
                                <td style={{ padding: '1.25rem' }}>{log.quantity} {log.inventoryItem.unit}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: 'var(--danger)',
                                        fontWeight: 600
                                    }}>
                                        {log.reason}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td style={{ padding: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>
                                        {formatCurrency(log.quantity * log.inventoryItem.unitPrice)}
                                    </td>
                                )}
                                {isAdmin && (
                                    <td style={{ padding: '1.25rem', color: 'var(--text-muted)' }}>
                                        {log.user?.name || 'System'}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {wasteLogs.length === 0 && (
                    <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Trash2 size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                        <p>No waste transactions found for this period.</p>
                    </div>
                )}
            </div>

            {/* Log Waste Modal */}
            {isLogModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '450px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
                            <h2>Report New Waste</h2>
                            <button onClick={() => setIsLogModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        {!selectedItem ? (
                            <>
                                <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search inventory items..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                                    {filteredInventory.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedItem(item)}
                                            style={{
                                                padding: '1rem',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                marginBottom: '0.75rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                            className="hover-glow"
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current: {item.quantity} {item.unit}</div>
                                            </div>
                                            <Plus size={16} color="var(--primary)" />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleLogWaste} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ padding: '1rem', background: 'var(--glass-shine)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selected Item</div>
                                        <div style={{ fontWeight: 700 }}>{selectedItem.name}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Change
                                    </button>
                                </div>

                                <div className="input-group">
                                    <label>Quantity Wasted ({selectedItem.unit})</label>
                                    <input
                                        className="auth-input"
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={logData.quantity}
                                        onChange={e => setLogData({ ...logData, quantity: e.target.value })}
                                        autoFocus
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Reason for Loss</label>
                                    <select
                                        className="auth-input"
                                        value={logData.reason}
                                        onChange={e => setLogData({ ...logData, reason: e.target.value })}
                                    >
                                        <option value="Spoilage">Spoilage / Expired</option>
                                        <option value="Spillage">Spillage / Damaged</option>
                                        <option value="Kitchen Error">Kitchen Error / Burnt</option>
                                        <option value="Customer Return">Customer Return</option>
                                        <option value="Theft">Unaccounted / Theft</option>
                                        <option value="Other">Other / Miscellaneous</option>
                                    </select>
                                </div>

                                <div style={{
                                    padding: '1.25rem',
                                    background: 'rgba(239, 68, 68, 0.05)',
                                    borderRadius: '12px',
                                    border: '1px dashed rgba(239, 68, 68, 0.2)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)' }}>Estimated Loss</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)' }}>
                                            {formatCurrency(parseFloat(logData.quantity || 0) * selectedItem.unitPrice)}
                                        </div>
                                    </div>
                                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                                        <DollarSign color="var(--danger)" />
                                    </div>
                                </div>

                                <button type="submit" className="nav-item active" style={{ padding: '1rem', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Trash2 size={18} /> Confirm Waste Entry
                                </button>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default WasteManagement;
