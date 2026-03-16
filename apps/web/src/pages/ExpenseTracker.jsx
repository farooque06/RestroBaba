import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';
import { Wallet, Plus, Search, Filter, Calendar, Trash2, Edit2, Loader2, TrendingDown, TrendingUp, DollarSign, UtensilsCrossed, User, Lightbulb, Home, Wrench, Megaphone, MoreHorizontal, X, Banknote } from 'lucide-react';
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

    const categories = [
        { id: 'Ingredients', icon: UtensilsCrossed, color: '#f59e0b' },
        { id: 'Salary', icon: User, color: '#818cf8' },
        { id: 'Utilities', icon: Lightbulb, color: '#10b981' },
        { id: 'Rent', icon: Home, color: '#ef4444' },
        { id: 'Maintenance', icon: Wrench, color: '#6366f1' },
        { id: 'Marketing', icon: Megaphone, color: '#f472b6' },
        { id: 'Others', icon: MoreHorizontal, color: '#94a3b8' }
    ];

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
            <div className="page-header">
                <div className="page-header-info">
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Expense Tracker</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage your daily operational costs and monitor profitability.</p>
                </div>
                <div className="page-header-actions">
                    <button
                        onClick={() => { setEditingItem(null); setFormData({ description: '', amount: '', category: 'Ingredients', date: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }}
                        className="btn-primary"
                    >
                        <Plus size={20} />
                        <span>Record Expense</span>
                    </button>
                </div>
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
                            key={cat.id}
                            onClick={() => setFilterCategory(cat.id)}
                            style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: '10px',
                                background: filterCategory === cat.id ? 'var(--primary)' : 'var(--glass-shine)',
                                border: '1px solid var(--glass-border)',
                                color: filterCategory === cat.id ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <cat.icon size={14} />
                            {cat.id}
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

            {isModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '450px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>{editingItem ? 'Edit Expense' : 'Record New Expense'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Description</label>
                                <input
                                    className="auth-input"
                                    required
                                    placeholder="e.g., Weekly Salary, Gas Bill"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    style={{ background: 'var(--glass-shine)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Amount (Rs.)</label>
                                    <div className="input-with-icon">
                                        <Banknote size={16} />
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            style={{ fontWeight: 700 }}
                                        />
                                    </div>
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Date</label>
                                    <div className="input-with-icon">
                                        <Calendar size={16} />
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', display: 'block', textTransform: 'uppercase' }}>Transaction Category</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {categories.map(cat => (
                                        <div 
                                            key={cat.id}
                                            onClick={() => setFormData({ ...formData, category: cat.id })}
                                            style={{
                                                padding: '0.75rem 0.25rem',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                background: formData.category === cat.id ? `${cat.color}15` : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${formData.category === cat.id ? cat.color : 'var(--glass-border)'}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <cat.icon size={16} color={formData.category === cat.id ? cat.color : 'var(--text-muted)'} />
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: formData.category === cat.id ? 'var(--text-main)' : 'var(--text-muted)' }}>{cat.id}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '1rem', borderRadius: '16px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                                <button type="submit" className="premium-button active" style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
                                    {editingItem ? 'Update Record' : 'Save Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
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
