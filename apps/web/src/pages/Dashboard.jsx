import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    UtensilsCrossed,
    Loader2,
    BarChart3,
    TrendingUp,
    ChevronRight,
    Package,
    Building2,
    ShieldCheck,
    Store,
    BookOpen,
    ChefHat,
    Clock,
    Zap,
    History,
    DollarSign,
    Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

const PLAN_RANK = { 'SILVER': 1, 'GOLD': 2, 'DIAMOND': 3 };
const hasPlan = (user, minPlan) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    const currentPlan = user?.client?.plan || 'SILVER';
    return PLAN_RANK[currentPlan] >= PLAN_RANK[minPlan];
};

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ activeTables: 0, kitchenOrders: 0, lowStockCount: 0, lowStockItems: [] });
    const [superStats, setSuperStats] = useState(null);
    const [globalActivity, setGlobalActivity] = useState([]);
    const [currentShift, setCurrentShift] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(() => fetchStats(true), 30000); // 30s sync
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async (silent = false) => {
        if (!silent) setLoading(true);
        const token = localStorage.getItem('restroToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            if (user?.role === 'SUPER_ADMIN') {
                const [statsRes, activityRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/stats/super-admin`, { headers }),
                    fetch(`${API_BASE_URL}/api/activity?type=PLATFORM&limit=10`, { headers })
                ]);

                const [statsData, activityData] = await Promise.all([
                    statsRes.json(),
                    activityRes.json()
                ]);

                if (statsRes.ok) setSuperStats(statsData);
                if (activityRes.ok) setGlobalActivity(activityData.logs || []);

                setLoading(false);
                return;
            }

            // Only admins can access dashboard operations metrics; shift status is available to managers too.
            const canAccessShifts = ['ADMIN', 'MANAGER'].includes(user?.role) && hasPlan(user, 'GOLD');
            const [statsRes, currentRes] = await Promise.all([
                user?.role === 'ADMIN' ? fetch(`${API_BASE_URL}/api/stats`, { headers }) : Promise.resolve(null),
                canAccessShifts ? fetch(`${API_BASE_URL}/api/shifts/current`, { headers }) : Promise.resolve(null)
            ]);

            if (statsRes?.ok) {
                const statsData = await statsRes.json();
                setStats({
                    activeTables: statsData.activeTables,
                    kitchenOrders: statsData.kitchenOrders,
                    lowStockCount: statsData.lowStockCount,
                    lowStockItems: statsData.lowStockItems || []
                });
            }
            if (currentRes && currentRes.ok) {
                const shiftData = await currentRes.json();
                setCurrentShift(shiftData);
            }

        } catch (err) {
            console.error('Analytics fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !superStats) return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)' }}>Synchronizing ecosystem data...</p>
        </div>
    );

    // --- SUPER ADMIN VIEW ---
    if (user?.role === 'SUPER_ADMIN' && superStats) {
        return (
            <div className="page-container animate-fade">
                {/* Command Center Header */}
                <div className="sa-header">
                    <div className="sa-header-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div className="premium-glass" style={{ padding: '8px', borderRadius: '12px', color: 'var(--primary)', background: 'var(--primary-glow)' }}>
                                <ShieldCheck size={20} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--primary)' }}>Ecosystem Command Center</span>
                        </div>
                        <h1>Platform Intelligence</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '4px' }}>Global performance metrics across all node clusters.</p>
                    </div>

                    <div className="sa-header-actions">
                        <Link to="/clients" className="nav-item active" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building2 size={18} />
                            <span>Provision New Node</span>
                        </Link>
                        <Link to="/plans" className="nav-item" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <Zap size={18} />
                            <span>Architect Plans</span>
                        </Link>
                    </div>
                </div>

                <div className="sa-stats-grid">
                    {/* Revenue Forecast Card */}
                    <div className="premium-glass sa-card-revenue" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Estimated MRR</span>
                            <div style={{ padding: '6px', borderRadius: '10px', background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-muted)' }}>Rs.</span>
                            <h2 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, margin: 0 }}>{superStats.revenue.estimatedMRR.toLocaleString()}</h2>
                        </div>
                        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Annual Forecast: Rs. {superStats.revenue.annualForecast.toLocaleString()}
                        </p>
                    </div>

                    {/* Node Capacity Card */}
                    <div className="premium-glass" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Node Distribution</span>
                            <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                                <Store size={20} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <h2 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, margin: 0 }}>{superStats.clientKPIs.total}</h2>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--success)' }}>{superStats.clientKPIs.active} Operational</span>
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px' }}>
                            {Object.entries(superStats.distribution).map(([plan, count]) => (
                                <span key={plan} className={`badge ${plan === 'DIAMOND' ? 'badge-primary' : plan === 'GOLD' ? 'badge-warning' : ''}`} style={{ fontSize: '0.65rem' }}>
                                    {plan}: {count}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Critical health Card */}
                    <div className="premium-glass sa-card-health" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Intervention Required</span>
                            <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                <Clock size={20} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, margin: 0, color: superStats.clientKPIs.upcomingRenewalsCount > 0 ? '#fbbf24' : 'inherit' }}>
                                    {superStats.clientKPIs.upcomingRenewalsCount}
                                </h2>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Renewals (15d)</span>
                            </div>
                            <div>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, margin: 0, color: superStats.clientKPIs.pendingPaymentsCount > 0 ? '#ef4444' : 'inherit' }}>
                                    {superStats.clientKPIs.pendingPaymentsCount}
                                </h2>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overdue nodes</span>
                            </div>
                        </div>
                        <Link to="/clients" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '1.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)', textDecoration: 'none' }}>
                            Launch Intervention <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                <div className="sa-main-grid">
                    {/* Live Ecosystem Activity */}
                    <div className="premium-glass" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Global Activity Stream</h3>
                            <Link to="/activity" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Full Log</Link>
                        </div>
                        <div className="sa-activity-list">
                            {globalActivity.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recent activity detected.</p>
                            ) : globalActivity.map((log, idx) => (
                                <div key={log.id || idx} className="sa-activity-item premium-glass">
                                    <div style={{
                                        padding: '8px', borderRadius: '10px',
                                        background: log.action.includes('CREATE') ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
                                        color: log.action.includes('CREATE') ? 'var(--success)' : '#38bdf8'
                                    }}>
                                        <History size={16} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                            {log.user?.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{log.details || log.action}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800 }}>{log.client?.name || 'Platform'}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Urgent Interventions */}
                        {(superStats.clientKPIs.upcomingRenewals.length > 0 || superStats.clientKPIs.pendingPayments.length > 0) && (
                            <div className="premium-glass" style={{ padding: '2rem', border: '1px solid rgba(239,68,68,0.15)' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--danger)' }}>Urgent Interventions</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {superStats.clientKPIs.pendingPayments.slice(0, 3).map(client => (
                                        <div key={client.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{client.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>Payment {client.paymentStatus}</div>
                                            </div>
                                            <Link to={`/clients?search=${client.name}`} className="icon-button" style={{ color: 'var(--primary)' }}><ChevronRight size={18} /></Link>
                                        </div>
                                    ))}
                                    {superStats.clientKPIs.upcomingRenewals.slice(0, 3).map(client => (
                                        <div key={client.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{client.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#fbbf24' }}>
                                                    Expires {(() => {
                                                        const d = new Date(client.subscriptionEnd);
                                                        return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Invalid Date';
                                                    })()}
                                                </div>
                                            </div>
                                            <Link to={`/clients?search=${client.name}`} className="icon-button" style={{ color: 'var(--primary)' }}><ChevronRight size={18} /></Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent Onboarding */}
                        <div className="premium-glass" style={{ padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Recent Deployments</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {superStats.recentClients.slice(0, 3).map(client => (
                                    <div key={client.id} className="ranking-item" style={{ padding: '0.5rem 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                                <Building2 size={16} color="var(--primary)" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{client.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{client.plan} Tier</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Link to="/clients" className="nav-item" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center', textDecoration: 'none', background: 'var(--bg-card)', fontSize: '0.8rem', padding: '10px' }}>
                                View All Nodes
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- ADMIN / STAFF VIEW ---
    return (
        <div className="page-container animate-fade dashboard-page">
            {user?.subscriptionWarning !== null && user?.subscriptionWarning <= 7 && user?.role !== 'SUPER_ADMIN' && (
                <div className="premium-glass animate-slideDown" style={{ 
                    padding: '1rem 1.5rem', 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    border: '1px solid rgba(245, 158, 11, 0.2)', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Clock size={20} color="#f59e0b" />
                        <div>
                            <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.9rem' }}>Subscription Expiring Soon</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Your system access will expire in {user.subscriptionWarning} {user.subscriptionWarning <= 0 ? 'today' : `${user.subscriptionWarning} ${user.subscriptionWarning === 1 ? 'day' : 'days'}`}. Please renew to avoid service interruption.
                            </div>
                        </div>
                    </div>
                    <Link to="/billing" style={{ 
                        padding: '8px 16px', 
                        background: '#f59e0b', 
                        color: 'white', 
                        borderRadius: '8px', 
                        textDecoration: 'none', 
                        fontSize: '0.85rem', 
                        fontWeight: 700 
                    }}>
                        Renew Now
                    </Link>
                </div>
            )}

            <div className="dashboard-header dashboard-hero">
                <div>
                    <span className="dashboard-eyebrow">
                        <LayoutDashboard size={14} />
                        {user?.clientName || 'Restaurant overview'}
                    </span>
                    <h1 className="dashboard-title">
                        Welcome back, {user?.name?.split(' ')[0] || 'there'}
                    </h1>
                    <p className="dashboard-subtitle">
                        Your restaurant at a glance. Here’s what needs your attention today.
                    </p>
                </div>
                {['ADMIN', 'MANAGER'].includes(user?.role) && hasPlan(user, 'GOLD') && (
                    <Link to="/shifts" className={`status-badge ${currentShift ? 'active' : 'warn'}`}>
                        <Clock size={16} />
                        {currentShift ? 'Shift Active' : 'Shift Not Opened'}
                    </Link>
                )}
            </div>

            {user?.role === 'ADMIN' && (
                <div className="dashboard-actions">
                    <Link to="/reports" className="btn-primary" style={{ textDecoration: 'none' }}>
                        <BarChart3 size={18} />
                        View Detailed Reports
                    </Link>
                    {hasPlan(user, 'DIAMOND') && (
                        <Link to="/activity" className="btn-ghost" style={{ textDecoration: 'none' }}>
                            <TrendingUp size={18} />
                            System Activity
                        </Link>
                    )}
                </div>
            )}

            {/* QUICK OPERATIONS DASH */}
            <section className="dashboard-quick-section" aria-labelledby="quick-operations-heading">
                <div className="dashboard-section-header">
                    <div className="dashboard-section-indicator" />
                    <div>
                        <h3 id="quick-operations-heading">Quick operations</h3>
                        <p>Jump straight into the tasks you use most.</p>
                    </div>
                </div>

                <div className="dashboard-ops-grid">
                    {[
                        { label: 'Browse Menu', icon: BookOpen, path: '/menu', color: 'var(--primary)', variant: 'primary', minPlan: 'SILVER', roles: ['ADMIN', 'MANAGER', 'CHEF', 'WAITER'] },
                        { label: 'New Order', icon: UtensilsCrossed, path: '/tables', color: 'var(--primary)', variant: 'primary', minPlan: 'SILVER', roles: ['ADMIN', 'MANAGER', 'WAITER'] },
                        { label: 'Kitchen', icon: ChefHat, path: '/kitchen', color: 'var(--warning)', variant: 'warning', minPlan: 'GOLD', roles: ['ADMIN', 'MANAGER', 'CHEF'] },
                        { label: 'Add Expense', icon: DollarSign, path: '/expenses', color: 'var(--danger)', variant: 'danger', minPlan: 'GOLD', roles: ['ADMIN', 'MANAGER'] },
                        { label: 'Manage Stock', icon: Package, path: '/inventory', color: 'var(--text-main)', variant: 'default', minPlan: 'SILVER', roles: ['ADMIN', 'MANAGER', 'CHEF'] },
                        { label: 'Shift Console', icon: Clock, path: '/shifts', color: 'var(--warning)', variant: 'warning', minPlan: 'GOLD', roles: ['ADMIN', 'MANAGER'] },
                        { label: 'Staff Ops', icon: Users, path: '/staff', color: 'var(--primary)', variant: 'primary', minPlan: 'SILVER', roles: ['ADMIN', 'MANAGER'] },
                        { label: 'Reports', icon: BarChart3, path: '/reports', color: 'var(--success)', variant: 'success', minPlan: 'SILVER', roles: ['ADMIN', 'MANAGER'] },
                    ].filter(action => action.roles.includes(user?.role) && hasPlan(user, action.minPlan)).map((action, idx) => (
                        <Link
                            key={idx}
                            to={action.path}
                            className={`premium-glass dashboard-ops-card dashboard-ops-card-${action.variant}`}
                            style={{ '--dashboard-action-color': action.color }}
                        >
                            <div className="dashboard-ops-icon">
                                <action.icon size={20} strokeWidth={2.2} />
                            </div>
                            <span className="dashboard-ops-label">{action.label}</span>
                            <ChevronRight className="dashboard-ops-arrow" size={18} />
                        </Link>
                    ))}
                </div>
            </section>

            {/* OPERATIONAL STATUS (Quick Glance) */}
            {user?.role === 'ADMIN' && (
                <section className="dashboard-data-section" aria-labelledby="operations-status-heading">
                    <div className="dashboard-section-header">
                        <div className="dashboard-section-indicator" />
                        <div>
                            <h3 id="operations-status-heading">Live operations</h3>
                            <p>A quick pulse on today’s service.</p>
                        </div>
                    </div>
                    <div className="dashboard-grid dashboard-operational-grid">
                        <div className="stat-card dashboard-stat-card">
                            <div className="dashboard-stat-heading">
                                <span className="stat-label">Kitchen orders</span>
                                <span className="dashboard-stat-icon warning"><UtensilsCrossed size={18} /></span>
                            </div>
                            <span className="stat-value">{stats.kitchenOrders}</span>
                            <span className="dashboard-stat-caption">Orders in progress</span>
                        </div>
                        <div className={`stat-card dashboard-stat-card ${stats.lowStockCount > 0 ? 'is-alert' : 'is-healthy'}`}>
                            <div className="dashboard-stat-heading">
                                <span className="stat-label">Stock status</span>
                                <span className={`dashboard-stat-icon ${stats.lowStockCount > 0 ? 'danger' : 'success'}`}><Package size={18} /></span>
                            </div>
                            <span className="stat-value" style={{ color: stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                {stats.lowStockCount > 0 ? `${stats.lowStockCount} low` : 'Healthy'}
                            </span>
                            <span className="dashboard-stat-caption">{stats.lowStockCount > 0 ? 'Items need restocking' : 'No low-stock items'}</span>
                        </div>
                        <div className="stat-card dashboard-stat-card">
                            <div className="dashboard-stat-heading">
                                <span className="stat-label">Active tables</span>
                                <span className="dashboard-stat-icon primary"><Store size={18} /></span>
                            </div>
                            <span className="stat-value">{stats.activeTables}</span>
                            <span className="dashboard-stat-caption">Tables in service</span>
                        </div>
                    </div>
                    {stats.lowStockCount > 0 && (
                        <div className="dashboard-stock-attention">
                            <div className="dashboard-stock-attention-heading">
                                <div>
                                    <strong>Needs restocking</strong>
                                    <span>{stats.lowStockCount} inventory {stats.lowStockCount === 1 ? 'item is' : 'items are'} below threshold.</span>
                                </div>
                                <Link to="/inventory">Open inventory <ChevronRight size={16} /></Link>
                            </div>
                            {stats.lowStockItems.length > 0 && (
                                <ul>
                                    {stats.lowStockItems.map((item, index) => (
                                        <li key={`${item.name}-${index}`}>
                                            <span>{item.name}</span>
                                            <span>{item.quantity} {item.unit} left</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </section>
            )}


            {/* Premium Service Message Footer */}
            <div className="premium-glass dashboard-footer">
                <div className="dashboard-footer-icon">
                    <UtensilsCrossed size={40} color="var(--primary)" />
                </div>
                <h2>Here’s to a great service.</h2>
                <p>Thanks for taking care of every guest, every order, and every detail.</p>
            </div>
        </div>
    );
};

export default Dashboard;
