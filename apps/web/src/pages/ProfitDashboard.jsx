import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { TrendingUp, DollarSign, PieChart, ArrowRight, Loader2, Package, Tag, Percent, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const ProfitDashboard = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/profit`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setReport(data);
        } catch (err) {
            console.error('Failed to fetch profit report', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    if (!report) return <div className="page-container">No data available</div>;

    const { summary, items } = report;

    return (
        <div className="page-container animate-fade">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Profit Analytics</h1>
                <p style={{ color: 'var(--text-muted)' }}>Gross Profit and COGS analysis based on recipe costs.</p>
            </div>

            {/* Top Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                            <TrendingUp color="#3b82f6" size={24} />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Revenue</span>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>{formatCurrency(summary.totalRevenue)}</h2>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                            <Package color="var(--danger)" size={24} />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Food Cost (COGS)</span>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>{formatCurrency(summary.totalCost)}</h2>
                </div>

                <div className="stat-card" style={{ border: '2px solid var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                            <DollarSign color="#10b981" size={24} />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Estimated Net Profit</span>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(summary.netProfit)}</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Gross: {formatCurrency(summary.grossProfit)}</p>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                            <AlertTriangle color="var(--danger)" size={24} />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Waste & Shrinkage</span>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--danger)' }}>{formatCurrency(summary.totalWasteLoss)}</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{((summary.totalWasteLoss / summary.totalRevenue) * 100).toFixed(1)}% of Revenue</p>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                            <Percent color="#8b5cf6" size={24} />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Gross Margin</span>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>{summary.margin.toFixed(1)}%</h2>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Detailed Analysis */}
                <div className="premium-glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={20} color="var(--primary)" /> Item Profitability Rank
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem' }}>Menu Item</th>
                                    <th style={{ padding: '1rem' }}>Sold</th>
                                    <th style={{ padding: '1rem' }}>Unit Cost</th>
                                    <th style={{ padding: '1rem' }}>Revenue</th>
                                    <th style={{ padding: '1rem' }}>Gross Profit</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.name} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{item.name}</td>
                                        <td style={{ padding: '1rem' }}>{item.sold}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{formatCurrency(item.cost / item.sold)}</td>
                                        <td style={{ padding: '1rem' }}>{formatCurrency(item.revenue)}</td>
                                        <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(item.profit)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <div style={{ width: '40px', height: '6px', background: 'var(--glass-shine)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${(item.profit / item.revenue) * 100}%`, height: '100%', background: 'var(--primary)' }}></div>
                                                </div>
                                                <span style={{ fontSize: '0.8rem' }}>{((item.profit / item.revenue) * 100).toFixed(0)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Insights Side Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="premium-glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Waste Breakdown</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {report.waste && Object.entries(report.waste.breakdown).map(([reason, amount]) => (
                                <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                                    <span style={{ fontSize: '0.85rem' }}>{reason}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(amount)}</span>
                                </div>
                            ))}
                            {(!report.waste || Object.keys(report.waste.breakdown).length === 0) && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No waste recorded</p>
                            )}
                        </div>
                    </div>

                    <div className="premium-glass" style={{ padding: '1.5rem', background: 'var(--primary)', color: 'white' }}>
                        <PieChart size={32} style={{ marginBottom: '1rem', opacity: 0.8 }} />
                        <h3 style={{ marginBottom: '0.5rem' }}>Food Cost Ratio</h3>
                        <p style={{ opacity: 0.9, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Your food cost is currently {((summary.totalCost / summary.totalRevenue) * 100).toFixed(1)}% of your total revenue.
                        </p>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${(summary.totalCost / summary.totalRevenue) * 100}%`, height: '100%', background: 'white' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfitDashboard;
