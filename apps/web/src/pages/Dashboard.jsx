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
    Clock,
    Zap,
    History,
    DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ revenue: 0, expenses: 0, profit: 0, activeTables: 0, kitchenOrders: 0, lowStockCount: 0, lowStockItems: [] });
    const [superStats, setSuperStats] = useState(null);
    const [globalActivity, setGlobalActivity] = useState([]);
    const [analytics, setAnalytics] = useState({
        dailySales: {},
        topItems: [],
        staffPerformance: [],
        profitReport: null
    });
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

            // Parallel fetching for high performance (ADMIN)
            const [statsRes, salesRes, itemsRes, staffRes, profitRes, currentRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/stats`, { headers }),
                fetch(`${API_BASE_URL}/api/stats/daily-sales`, { headers }),
                fetch(`${API_BASE_URL}/api/stats/top-items`, { headers }),
                fetch(`${API_BASE_URL}/api/stats/staff-performance`, { headers }),
                fetch(`${API_BASE_URL}/api/reports/profit`, { headers }),
                fetch(`${API_BASE_URL}/api/shifts/current`, { headers })
            ]);

            const [statsData, salesData, itemsData, staffData, profitData, shiftData] = await Promise.all([
                statsRes.json(),
                salesRes.json(),
                itemsRes.json(),
                staffRes.json(),
                profitRes.json(),
                currentRes.json()
            ]);

            if (statsRes.ok) setStats(statsData);
            if (currentRes.ok) setCurrentShift(shiftData);
            setAnalytics({
                dailySales: salesData || {},
                topItems: itemsData || [],
                staffPerformance: staffData || [],
                profitReport: profitData || null
            });

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
                                                <div style={{ fontSize: '0.7rem', color: '#fbbf24' }}>Expires {new Date(client.subscriptionEnd).toLocaleDateString()}</div>
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
        <div className="page-container animate-fade">
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                        Welcome back, {user?.name?.split(' ')[0]}
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Here's what's happening at <strong style={{ color: 'var(--text-main)' }}>{user?.clientName}</strong> today.
                    </p>
                </div>
                {user?.role === 'ADMIN' && (
                    <Link to="/shifts" className={`status-badge ${currentShift ? 'active' : 'warn'}`}>
                        <Clock size={16} />
                        {currentShift ? 'Shift Active' : 'Shift Not Opened'}
                    </Link>
                )}
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

            {/* QUICK OPERATIONS DASH */}
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                    <div style={{ width: '4px', height: '16px', background: 'var(--primary)', borderRadius: '2px' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Quick Operations</h3>
                </div>
                
                <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
                    {[
                        { label: 'New Order', icon: UtensilsCrossed, path: '/tables', color: 'var(--primary)', variant: 'primary' },
                        { label: 'Add Expense', icon: DollarSign, path: '/expenses', color: 'var(--danger)', variant: 'danger' },
                        { label: 'Manage Stock', icon: Package, path: '/inventory', color: 'var(--text-main)', variant: 'default' },
                        { label: 'Shift Console', icon: Clock, path: '/shifts', color: 'var(--warning)', variant: 'warning' },
                        { label: 'Staff Ops', icon: Users, path: '/staff', color: 'var(--primary)', variant: 'primary' },
                        { label: 'Analytics', icon: BarChart3, path: '/reports', color: 'var(--success)', variant: 'success' },
                    ].map((action, idx) => (
                        <Link 
                            key={idx} 
                            to={action.path} 
                            className="premium-glass" 
                            style={{ 
                                padding: '1.25rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                gap: '0.75rem', 
                                textDecoration: 'none',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                border: '1px solid var(--border)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.borderColor = action.color;
                                e.currentTarget.style.boxShadow = `0 10px 20px -5px ${action.color}33`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{ 
                                padding: '10px', 
                                borderRadius: '12px', 
                                background: idx === 0 ? 'var(--primary-glow)' : 'rgba(255,255,255,0.03)',
                                color: action.color,
                                marginBottom: '0.25rem'
                            }}>
                                <action.icon size={22} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', textAlign: 'center' }}>{action.label}</span>
                            
                            {/* Subtle background glow for first item (conversion focus) */}
                            {idx === 0 && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: '-20%', 
                                    right: '-20%', 
                                    width: '60%', 
                                    height: '60%', 
                                    background: 'var(--primary)', 
                                    filter: 'blur(30px)', 
                                    opacity: 0.1, 
                                    zIndex: -1 
                                }} />
                            )}
                        </Link>
                    ))}
                </div>
            </div>

            {/* OPERATIONAL STATUS (Quick Glance) */}
            <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
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
                <div className="stat-card">
                    <span className="stat-label">Active Tables</span>
                    <span className="stat-value">{stats.activeTables}</span>
                    <span className="badge badge-primary">Current Service</span>
                </div>
            </div>

            {/* FINANCIAL HEALTH (Detailed Analysis for admins) */}
            {user?.role === 'ADMIN' && analytics.profitReport && (
                <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card analytics" style={{ background: 'var(--bg-main)' }}>
                        <span className="stat-label">Total Revenue</span>
                        <span className="stat-value" style={{ color: 'var(--success)' }}>
                            {formatCurrency(analytics.profitReport.summary.totalRevenue)}
                        </span>
                        <span className="badge badge-success">Gross Sales</span>
                    </div>
                    
                    <div className="stat-card analytics" style={{ background: 'var(--bg-main)' }}>
                        <span className="stat-label">Inventory Loss (Waste)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span className="stat-value" style={{ color: 'var(--danger)' }}>
                                {formatCurrency(analytics.profitReport.summary.totalWasteLoss)}
                            </span>
                            <span className="badge badge-danger">Leakage</span>
                        </div>
                    </div>

                    <div className="stat-card analytics" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: '#10b98133' }}>
                        <span className="stat-label">True Net Profit</span>
                        <span className="stat-value" style={{ color: '#10b981' }}>
                            {formatCurrency(analytics.profitReport.summary.netProfit)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                            <span className="badge badge-primary" style={{ background: '#10b981', color: 'white' }}>
                                Margin: {analytics.profitReport.summary.margin.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ADVANCED ANALYTICS SECTION */}
            {user?.role === 'ADMIN' && (
                <div className="analytics-grid">
                    {/* Revenue Trend Chart */}
                    <div className="analytics-chart-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Revenue Trend (Net)</h3>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last 7 Days</span>
                        </div>
                        <div className="ranking-list">
                            {Object.entries(analytics.dailySales).map(([date, amount]) => {
                                const maxVal = Math.max(...Object.values(analytics.dailySales), 1);
                                const widthPercent = (amount / maxVal) * 100;
                                return (
                                    <div key={date} className="ranking-item">
                                        <div className="ranking-info">
                                            <span className="ranking-name">
                                                {new Date(date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className="ranking-stats" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                                {formatCurrency(amount)}
                                            </span>
                                        </div>
                                        <div className="ranking-progress-bg">
                                            <div 
                                                className="ranking-progress-fill" 
                                                style={{ 
                                                    width: `${widthPercent}%`,
                                                    background: 'var(--primary-gradient)',
                                                    boxShadow: '0 2px 10px var(--primary-glow)'
                                                }} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Top Items & Staff Leaderboard Container */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Top Selling Items */}
                        <div className="analytics-chart-container">
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Top Selling Items</h3>
                            <div className="ranking-list">
                                {analytics.topItems.map((item, idx) => {
                                    const maxQty = analytics.topItems[0]?.quantity || 1;
                                    const widthPercent = (item.quantity / maxQty) * 100;
                                    return (
                                        <div key={idx} className="ranking-item">
                                            <div className="ranking-info">
                                                <span className="ranking-name">{item.name}</span>
                                                <span className="ranking-stats">{item.quantity} units</span>
                                            </div>
                                            <div className="ranking-progress-bg">
                                                <div className="ranking-progress-fill" style={{ width: `${widthPercent}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Staff Efficiency */}
                        <div className="analytics-chart-container">
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Staff Performance</h3>
                            <div className="ranking-list">
                                {analytics.staffPerformance.slice(0, 3).map((staff, idx) => {
                                    const maxActions = analytics.staffPerformance[0]?.actions || 1;
                                    const widthPercent = (staff.actions / maxActions) * 100;
                                    return (
                                        <div key={idx} className="ranking-item">
                                            <div className="ranking-info">
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span className="ranking-name">{staff.name}</span>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{staff.role}</span>
                                                </div>
                                                <span className="ranking-stats">{staff.actions} actions</span>
                                            </div>
                                            <div className="ranking-progress-bg">
                                                <div className="ranking-progress-fill" style={{ width: `${widthPercent}%`, background: 'var(--success-gradient)' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Premium Service Message Footer */}
            <div className="premium-glass" style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(212,175,55,0.03) 100%)',
                marginTop: '1rem',
                border: '1px solid var(--border)'
            }}>
                <div style={{
                    padding: '1.25rem',
                    background: 'var(--primary-glow)',
                    borderRadius: '50%',
                    marginBottom: '2rem',
                    boxShadow: '0 10px 30px var(--primary-glow)'
                }}>
                    <UtensilsCrossed size={40} color="var(--primary)" />
                </div>
                <h2 style={{ 
                    marginBottom: '1rem', 
                    fontSize: '1.75rem', 
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    background: 'var(--primary-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    A Passion for Perfect Service
                </h2>
                <p style={{ 
                    color: 'var(--text-muted)', 
                    maxWidth: '500px', 
                    fontSize: '1rem', 
                    lineHeight: 1.7,
                    fontStyle: 'italic',
                    margin: '0 auto 2rem'
                }}>
                    "Success is the sum of small efforts, repeated day-in and day-out. Your commitment to excellence is what makes {user?.clientName} extraordinary."
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ height: '1px', width: '40px', background: 'var(--border)' }}></div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
                        Ready for a Great Shift
                    </span>
                    <div style={{ height: '1px', width: '40px', background: 'var(--border)' }}></div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
