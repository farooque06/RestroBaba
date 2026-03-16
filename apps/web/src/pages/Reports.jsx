import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3,
    TrendingUp,
    Users,
    Package,
    Calendar,
    Loader2,
    ArrowUpRight,
    Award,
    Utensils,
    DollarSign
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const PLAN_RANK = { 'SILVER': 1, 'GOLD': 2, 'DIAMOND': 3 };
const hasPlan = (user, minPlan) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    const currentPlan = user?.client?.plan || 'SILVER';
    return PLAN_RANK[currentPlan] >= PLAN_RANK[minPlan];
};

const Reports = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [salesData, setSalesData] = useState({});
    const [topItems, setTopItems] = useState([]);
    const [staffStats, setStaffStats] = useState([]);
    const [categorySales, setCategorySales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllStats();
    }, []);

    const fetchAllStats = async () => {
        const token = localStorage.getItem('restroToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const [salesRes, itemsRes, staffRes, categoryRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/stats/daily-sales`, { headers }),
                fetch(`${API_BASE_URL}/api/stats/top-items`, { headers }),
                fetch(`${API_BASE_URL}/api/stats/staff-performance`, { headers }),
                fetch(`${API_BASE_URL}/api/stats/category-sales`, { headers })
            ]);

            const [sales, items, staff, category] = await Promise.all([
                salesRes.json(),
                itemsRes.json(),
                staffRes.json(),
                categoryRes.json()
            ]);

            setSalesData(sales);
            setTopItems(items);
            setStaffStats(staff);
            setCategorySales(category);
        } catch (err) {
            console.error('Failed to fetch analytics', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    const maxSale = Math.max(...Object.values(salesData), 100);

    return (
        <div className="page-container animate-fade">
            <div className="page-header">
                <div className="page-header-info">
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Business Analytics</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Deep insights into sales performance and operational efficiency.</p>
                </div>
            </div>

            {/* Profit Analytics CTA (GOLD+) */}
            {hasPlan(user, 'GOLD') && (
                <div
                    onClick={() => navigate('/profit-analytics')}
                    className="premium-glass animate-fade-in"
                    style={{
                        padding: '2rem',
                        marginBottom: '2rem',
                        background: 'var(--primary-gradient)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: 'none',
                        color: 'white'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '15px' }}>
                            <DollarSign size={32} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Advanced Profit Analytics</h2>
                            <p style={{ opacity: 0.9 }}>See your Gross Margin, COGS, and most profitable menu items based on real inventory costs.</p>
                        </div>
                    </div>
                    <ArrowUpRight size={32} />
                </div>
            )}

            <div className="analytics-grid">
                {/* Sales Chart Section */}
                <div className="premium-glass" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <TrendingUp size={20} color="var(--primary)" />
                            7-Day Sales Trend
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last 7 Days (NPR)</div>
                    </div>

                    <div style={{ position: 'relative', height: '240px', paddingBottom: '2.5rem', width: '100%', marginTop: '2rem' }}>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            <defs>
                                <linearGradient id="lineColor" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="1" />
                                </linearGradient>
                                <linearGradient id="areaColor" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            {/* Subtle Grid lines */}
                            <line x1="0" y1="25" x2="100" y2="25" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
                            <line x1="0" y1="75" x2="100" y2="75" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />

                            {Object.entries(salesData).length > 0 && (
                                <>
                                    <polygon 
                                        points={`0,100 ${Object.entries(salesData).map(([date, amount], i, arr) => `${(i / (arr.length - 1 || 1)) * 100},${100 - (amount / (maxSale || 1)) * 100}`).join(' ')} 100,100`} 
                                        fill="url(#areaColor)" 
                                    />
                                    <polyline 
                                        points={Object.entries(salesData).map(([date, amount], i, arr) => `${(i / (arr.length - 1 || 1)) * 100},${100 - (amount / (maxSale || 1)) * 100}`).join(' ')} 
                                        fill="none" 
                                        stroke="url(#lineColor)" 
                                        strokeWidth="2.5" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                    />
                                </>
                            )}
                        </svg>

                        {/* Interactive Data Points and Labels */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                            {Object.entries(salesData).map(([date, amount], i, arr) => {
                                const x = (i / (arr.length - 1 || 1)) * 100;
                                const y = 100 - (amount / (maxSale || 1)) * 100;
                                const isFirst = i === 0;
                                const isLast = i === arr.length - 1;
                                
                                return (
                                    <div key={date}>
                                        {/* Point on Line */}
                                        <div style={{ 
                                            position: 'absolute', left: `${x}%`, top: `${y}%`, 
                                            width: '12px', height: '12px', borderRadius: '50%', 
                                            background: 'var(--bg-main)', border: '2px solid var(--primary)', 
                                            transform: 'translate(-50%, -50%)', 
                                            boxShadow: '0 0 12px rgba(212, 175, 55, 0.4)', zIndex: 2 
                                        }}>
                                            {/* Hover Tooltip / Label */}
                                            <div style={{ 
                                                position: 'absolute', bottom: '16px', left: '50%', 
                                                transform: `translateX(${isFirst ? '0' : isLast ? '-100%' : '-50%'})`, 
                                                background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '6px', 
                                                fontSize: '0.7rem', fontWeight: 800, color: 'white', 
                                                border: '1px solid var(--glass-border)', whiteSpace: 'nowrap',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)', pointerEvents: 'none'
                                            }}>
                                                {formatCurrency(amount)}
                                            </div>
                                        </div>
                                        {/* X-Axis Date Label */}
                                        <div style={{ 
                                            position: 'absolute', left: `${x}%`, bottom: '-28px', 
                                            transform: `translateX(${isFirst ? '0%' : isLast ? '-100%' : '-50%'})`, 
                                            fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap',
                                            fontWeight: 600
                                        }}>
                                            {new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Top Items Section */}
                <div className="premium-glass" style={{ padding: '2rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Utensils size={20} color="var(--primary)" />
                        Top Sellers
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {topItems.map((item, index) => (
                            <div key={index}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{item.quantity} units</span>
                                </div>
                                <div style={{ height: '4px', background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${(item.quantity / topItems[0].quantity) * 100}%`,
                                        height: '100%',
                                        background: 'var(--primary)'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            <div className="dashboard-grid" style={{ marginTop: '2rem' }}>
                {/* Sales by Category Donut Chart */}
                <div className="premium-glass animate-fade-in" style={{ padding: '2rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <BarChart3 size={20} color="var(--primary)" />
                        Sales by Category
                    </h3>

                    {categorySales.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '240px', color: 'var(--text-muted)' }}>
                            No category data available.
                        </div>
                    ) : (
                        <div className="reports-donut-container" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                            {/* SVG Donut */}
                            <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0 }}>
                                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                    {categorySales.reduce((acc, cat, idx) => {
                                        // Calculate total value to find percentages
                                        const total = categorySales.reduce((sum, item) => sum + item.value, 0);
                                        const percentage = (cat.value / total) * 100;
                                        
                                        // SVG Circle math: Circumference of circle with r=40 is ~251.3
                                        const r = 40;
                                        const c = 2 * Math.PI * r;
                                        const dashArray = (percentage * c) / 100;
                                        const dashOffset = acc.currentOffset;
                                        
                                        // Colors mapping
                                        const colors = ['#d4af37', '#38bdf8', '#a855f7', '#10b981', '#f43f5e', '#f97316'];
                                        const color = colors[idx % colors.length];
 
                                        const segment = (
                                            <circle
                                                key={cat.name}
                                                cx="50"
                                                cy="50"
                                                r={r}
                                                fill="transparent"
                                                stroke={color}
                                                strokeWidth="16"
                                                strokeDasharray={`${dashArray} ${c}`}
                                                strokeDashoffset={-dashOffset}
                                                style={{ transition: 'all 1s ease', cursor: 'pointer' }}
                                                className="chart-segment"
                                            />
                                        );
 
                                        // Update offset for next segment
                                        acc.currentOffset += dashArray;
                                        acc.segments.push(segment);
                                        return acc;
                                    }, { currentOffset: 0, segments: [] }).segments}
                                    
                                    {/* Inner Text Center Hole */}
                                    <text x="50" y="48" textAnchor="middle" fill="var(--text-main)" fontSize="10" transform="rotate(90 50 50)" fontWeight="800">
                                        Total
                                    </text>
                                    <text x="50" y="60" textAnchor="middle" fill="var(--primary)" fontSize="12" transform="rotate(90 50 50)" fontWeight="900">
                                        {formatCurrency(categorySales.reduce((sum, item) => sum + item.value, 0))}
                                    </text>
                                </svg>
                            </div>
 
                            {/* Custom Legend */}
                            <div className="reports-legend" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                                {categorySales.map((cat, idx) => {
                                    const colors = ['#d4af37', '#38bdf8', '#a855f7', '#10b981', '#f43f5e', '#f97316'];
                                    const color = colors[idx % colors.length];
                                    const total = categorySales.reduce((sum, item) => sum + item.value, 0);
                                    const percent = ((cat.value / Math.max(total, 1)) * 100).toFixed(1);
 
                                    return (
                                        <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: color }} />
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cat.name}</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{formatCurrency(cat.value)}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{percent}%</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

                {/* Quick Insights */}
                <div className="premium-glass" style={{ padding: '2rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <BarChart3 size={20} color="var(--primary)" />
                        Summary
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        <div style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Avg. Daily Units</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                {Math.round(topItems.reduce((acc, i) => acc + i.quantity, 0) / 7)}
                            </div>
                        </div>
                        <div style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Peak Staff Impact</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                                {staffStats[0]?.name.split(' ')[0]}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
