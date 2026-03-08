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

const Reports = () => {
    const navigate = useNavigate();
    const [salesData, setSalesData] = useState({});
    const [topItems, setTopItems] = useState([]);
    const [staffStats, setStaffStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllStats();
    }, []);

    const fetchAllStats = async () => {
        const token = localStorage.getItem('restroToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const [salesRes, itemsRes, staffRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/stats/daily-sales`, { headers }),
                fetch(`${API_BASE_URL}/api/stats/top-items`, { headers }),
                fetch(`${API_BASE_URL}/api/stats/staff-performance`, { headers })
            ]);

            const [sales, items, staff] = await Promise.all([
                salesRes.json(),
                itemsRes.json(),
                staffRes.json()
            ]);

            setSalesData(sales);
            setTopItems(items);
            setStaffStats(staff);
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
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Business Analytics</h1>
                <p style={{ color: 'var(--text-muted)' }}>Deep insights into sales performance and operational efficiency.</p>
            </div>

            {/* Profit Analytics CTA */}
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Sales Chart Section */}
                <div className="premium-glass" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <TrendingUp size={20} color="var(--primary)" />
                            7-Day Sales Trend
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last 7 Days (NPR)</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '240px', paddingBottom: '2.5rem', position: 'relative' }}>
                        {Object.entries(salesData).map(([date, amount]) => {
                            const height = (amount / maxSale) * 100;
                            return (
                                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '100%',
                                        height: `${height}%`,
                                        background: 'var(--primary-gradient)',
                                        borderRadius: '6px 6px 2px 2px',
                                        transition: 'height 1s cubic-bezier(0.16, 1, 0.3, 1)',
                                        position: 'relative'
                                    }}>
                                        <div style={{ position: 'absolute', top: '-25px', width: '100%', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                                            {formatCurrency(amount)}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', marginTop: '10px' }}>
                                        {new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            );
                        })}
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

                {/* Staff Performance */}
                <div className="premium-glass" style={{ padding: '2rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Users size={20} color="var(--primary)" />
                        Staff Activity Ranking
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {staffStats.map((staff, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: index === 0 ? 'var(--primary-glow)' : 'var(--bg-card)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    color: index === 0 ? 'var(--primary)' : 'var(--text-muted)'
                                }}>
                                    {index === 0 ? <Award size={18} /> : index + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{staff.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{staff.role}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>{staff.actions}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Actions</div>
                                </div>
                            </div>
                        ))}
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
