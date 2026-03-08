import React, { useState, useEffect } from 'react';
import { LayoutDashboard, UtensilsCrossed, Loader2, BarChart3, TrendingUp, ChevronRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ revenue: 0, expenses: 0, profit: 0, activeTables: 0, kitchenOrders: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(() => fetchStats(true), 10000); // 10s sync
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async (silent = false) => {
        if (user?.role === 'SUPER_ADMIN') {
            setLoading(false);
            return;
        }
        if (!silent) setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setStats(data);
        } catch (err) {
            console.error('Stats fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)' }}>Loading system overview...</p>
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    Welcome back, {user?.name?.split(' ')[0]}
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    {user?.role === 'SUPER_ADMIN' ? (
                        "System Overview and Management Console."
                    ) : (
                        <>Here's what's happening at <strong style={{ color: 'var(--text-main)' }}>{user?.clientName}</strong> today.</>
                    )}
                </p>
            </div>

            {user?.role === 'ADMIN' && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <Link to="/reports" className="btn-primary" style={{ textDecoration: 'none' }}>
                        <BarChart3 size={18} />
                        View Detailed Reports
                    </Link>
                    <Link to="/activity" className="btn-ghost" style={{ textDecoration: 'none' }}>
                        <TrendingUp size={18} />
                        System Activity
                    </Link>
                </div>
            )}

            <div className="dashboard-grid">
                {user?.role === 'ADMIN' && (
                    <>
                        <div className="stat-card">
                            <span className="stat-label">Revenue</span>
                            <span className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(stats.revenue)}</span>
                            <span className="badge badge-success">Gross Inflow</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Expenses</span>
                            <span className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(stats.expenses)}</span>
                            <span className="badge badge-danger">Operating Costs</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Net Profit</span>
                            <span className="stat-value" style={{ color: stats.profit >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                                {formatCurrency(stats.profit)}
                            </span>
                            <span className="badge badge-primary">Real Earnings</span>
                        </div>
                    </>
                )}
                <div className="stat-card">
                    <span className="stat-label">Kitchen Load</span>
                    <span className="stat-value">{stats.kitchenOrders}</span>
                    <span className="badge badge-warning">Active Orders</span>
                </div>
                <div className="stat-card" style={{ borderColor: stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--border)' }}>
                    <span className="stat-label">Stock Status</span>
                    <span className="stat-value" style={{ color: stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {stats.lowStockCount > 0 ? `${stats.lowStockCount} LOW` : 'Healthy'}
                    </span>
                    <span className={`badge badge-${stats.lowStockCount > 0 ? 'danger' : 'success'}`}>
                        Inventory Items
                    </span>
                </div>
            </div>

            {stats.lowStockCount > 0 && user?.role === 'ADMIN' && (
                <div className="premium-glass animate-shake" style={{
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    borderLeft: '4px solid var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '2rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'var(--danger-glow)', borderRadius: '12px' }}>
                            <Package size={24} color="var(--danger)" />
                        </div>
                        <div>
                            <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Inventory Alerts Detected</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {stats.lowStockItems.map(i => i.name).join(', ')} {stats.lowStockCount > 5 ? 'and others' : ''} are below minimum threshold.
                            </p>
                        </div>
                    </div>
                    <Link to="/inventory" className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.8rem' }}>
                        Restock Now
                    </Link>
                </div>
            )}

            {user?.role === 'ADMIN' && (
                <div className="stat-card" style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-card)',
                    padding: '1.5rem 2rem'
                }}>
                    <div>
                        <span className="stat-label">System Access</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                            <span style={{
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                letterSpacing: '0.2em',
                                color: 'var(--primary)',
                                fontFamily: 'monospace'
                            }}>
                                {user?.shopCode || '******'}
                            </span>
                            <span className="badge badge-primary">Active Shop Code</span>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            if (!window.confirm('Warning: Regenerating the shop code will disconnect all currently logged-out devices. Continue?')) return;
                            const token = localStorage.getItem('restroToken');
                            const res = await fetch(`${API_BASE_URL}/api/clients/my-shop/regenerate`, {
                                method: 'PATCH',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) {
                                const data = await res.json();
                                alert(`Success! New Shop Code: ${data.shopCode}\nPlease log in again with the new code.`);
                                window.location.reload();
                            }
                        }}
                        className="btn-ghost"
                        style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                    >
                        Regenerate Code
                    </button>
                </div>
            )}

            <div className="premium-glass" style={{
                padding: '3rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <UtensilsCrossed size={48} color="var(--border)" style={{ marginBottom: '1.25rem' }} />
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Ready for Service</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '420px', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    Use the sidebar to manage Menu, Tables, and Orders. Everything syncs in real-time.
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
