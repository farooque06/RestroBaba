import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Wallet, Plus, Search, Filter, Calendar, Trash2, Edit2, Loader2, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { formatCurrency } from '../utils/formatters';

const ExpenseTracker = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ revenue: 0, expenses: 0, profit: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ description: '', amount: '', category: 'Ingredients', date: new Date().toISOString().split('T')[0] });
    const [filterCategory, setFilterCategory] = useState('All');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });

    const categories = ['Ingredients', 'Salary', 'Utilities', 'Rent', 'Maintenance', 'Marketing', 'Others'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const [expRes, statsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/expenses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const expData = await expRes.json();
            const statsData = await statsRes.json();

            if (expRes.ok) setExpenses(expData);
            if (statsRes.ok) setStats(statsData);
        } catch (err) {
            console.error('Failed to fetch expense data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('restroToken');
        const url = editingItem ? `${API_BASE_URL}/api/expenses/${editingItem.id}` : `${API_BASE_URL}/api/expenses`;
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
                fetchData();
                setIsModalOpen(false);
                setEditingItem(null);
                setFormData({ description: '', amount: '', category: 'Ingredients', date: new Date().toISOString().split('T')[0] });
            }
        } catch (err) {
            console.error('Failed to save expense', err);
        }
    };

    const handleDelete = (id) => {
        setConfirmAction({
            title: 'Delete Expense Record?',
            message: 'Are you sure you want to permanently delete this expense record? This will affect your calculated profit and stats.',
            onConfirm: () => performDelete(id)
        });
        setIsConfirmModalOpen(true);
    };

    const performDelete = async (id) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/expenses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) fetchData();
        } catch (err) {
            console.error('Failed to delete expense', err);
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            description: item.description,
            amount: item.amount.toString(),
            category: item.category,
            date: new Date(item.date).toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const filteredExpenses = expenses.filter(exp =>
        filterCategory === 'All' || exp.category === filterCategory
    );

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Expense Tracker</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your daily operational costs and monitor profitability.</p>
                </div>
                <button
                    onClick={() => { setEditingItem(null); setFormData({ description: '', amount: '', category: 'Ingredients', date: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }}
                    className="nav-item active"
                    style={{ border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
                >
                    <Plus size={20} />
                    <span>Record Expense</span>
                </button>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                    <span className="stat-label">Total Revenue</span>
                    <span className="stat-value" style={{ color: '#10b981' }}>{formatCurrency(stats.revenue)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#10b981' }}>
                        <TrendingUp size={12} />
                        <span>Gross Inflow</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Expenses</span>
                    <span className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(stats.expenses)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--danger)' }}>
                        <TrendingDown size={12} />
                        <span>Operating Costs</span>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: `4px solid ${stats.profit >= 0 ? '#10b981' : 'var(--danger)'}` }}>
                    <span className="stat-label">Net Profit</span>
                    <span className="stat-value" style={{ color: stats.profit >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                        {formatCurrency(stats.profit)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <DollarSign size={12} />
                        <span>Real Earnings</span>
                    </div>
                </div>
            </div>

            <div className="premium-glass" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', flex: 1 }}>
                    <button
                        onClick={() => setFilterCategory('All')}
                        style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '10px',
                            background: filterCategory === 'All' ? 'var(--primary)' : 'var(--glass-shine)',
                            border: '1px solid var(--glass-border)',
                            color: filterCategory === 'All' ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        All Categories
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: '10px',
                                background: filterCategory === cat ? 'var(--primary)' : 'var(--glass-shine)',
                                border: '1px solid var(--glass-border)',
                                color: filterCategory === cat ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="premium-glass" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--glass-shine)', borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '1.25rem' }}>Description</th>
                            <th style={{ padding: '1.25rem' }}>Category</th>
                            <th style={{ padding: '1.25rem' }}>Date</th>
                            <th style={{ padding: '1.25rem' }}>Amount</th>
                            <th style={{ padding: '1.25rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.map(exp => (
                            <tr key={exp.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '1.25rem', fontWeight: 600 }}>{exp.description}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '20px',
                                        background: 'rgba(129, 140, 248, 0.1)',
                                        color: 'var(--primary)',
                                        fontWeight: 700
                                    }}>
                                        {exp.category}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Calendar size={14} />
                                        {new Date(exp.date).toLocaleDateString()}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>
                                    -{formatCurrency(exp.amount)}
                                </td>
                                <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                    <button onClick={() => openEdit(exp)} className="premium-glass" style={{ padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', marginRight: '0.5rem' }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(exp.id)} className="premium-glass" style={{ padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', color: 'var(--danger)' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredExpenses.length === 0 && (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Wallet size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                        <p>No expense records found.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '400px' }}>
                        <h2>{editingItem ? 'Edit Expense' : 'Record New Expense'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                            <div className="input-group">
                                <label>Description (e.g., Weekly Salary, Gas Bill)</label>
                                <input
                                    className="auth-input"
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Amount (Rs.)</label>
                                    <input
                                        className="auth-input"
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Date</label>
                                    <input
                                        className="auth-input"
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Category</label>
                                <select
                                    className="auth-input"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    style={{ appearance: 'none' }}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" className="nav-item active" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

export default ExpenseTracker;
