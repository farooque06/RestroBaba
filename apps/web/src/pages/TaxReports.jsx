import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    Calendar, 
    Download, 
    Search, 
    TrendingUp, 
    PieChart, 
    ShieldCheck, 
    Printer,
    ArrowRight,
    Loader2,
    Filter,
    Table as TableIcon,
    BarChart3,
    Info
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TaxReports = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'vat-summary', 'monthly'
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    
    // Filters
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        fetchReport();
    }, [activeTab, selectedDate, selectedMonth]);

    const fetchReport = async () => {
        setLoading(true);
        const token = localStorage.getItem('restroToken');
        let url = `${API_BASE_URL}/api/tax-invoices`;
        
        try {
            if (activeTab === 'daily') {
                url += `/daily-register?date=${selectedDate}`;
            } else if (activeTab === 'vat-summary') {
                url += `/vat-summary?month=${selectedMonth}`;
            } else if (activeTab === 'monthly') {
                url += `/monthly-summary?month=${selectedMonth}`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok) {
                setReportData(data);
            } else {
                toast.error(data.error || 'Failed to fetch report');
            }
        } catch (error) {
            toast.error('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const renderDailyRegister = () => {
        if (!reportData || !reportData.summary) return null;
        const { summary, orders = [], cancelledOrders = [] } = reportData;

        return (
            <div className="animate-fade">
                {/* Summary Cards */}
                <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '2rem' }}>
                    <div className="stat-card">
                        <span className="stat-label">Total Orders</span>
                        <span className="stat-value">{summary.totalOrders || 0}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{user?.client?.useTax ? 'Taxable Amount' : 'Net Sales'}</span>
                        <span className="stat-value">{formatCurrency(summary.totalSubtotal || 0)}</span>
                    </div>
                    <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                        <span className="stat-label">{user?.client?.useTax ? 'Estimated VAT (13%)' : 'Taxes Collected'}</span>
                        <span className="stat-value" style={{ color: 'var(--primary)' }}>{formatCurrency(summary.totalTax || 0)}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Gross Revenue</span>
                        <span className="stat-value">{formatCurrency(summary.totalRevenue || 0)}</span>
                    </div>
                </div>

                {/* Table */}
                <div className="premium-glass" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Daily Sales Register (Bikri Khata)</h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date: {new Date(summary.date).toLocaleDateString()}</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--glass-shine)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '1rem' }}>Order No</th>
                                    <th style={{ padding: '1rem' }}>Guest / Table</th>
                                    <th style={{ padding: '1rem' }}>Subtotal</th>
                                    <th style={{ padding: '1rem' }}>Tax (VAT)</th>
                                    <th style={{ padding: '1rem' }}>S.Charge</th>
                                    <th style={{ padding: '1rem' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No completed orders found for this date.</td></tr>
                                ) : (
                                    orders.map(order => (
                                        <tr key={order.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 700 }}>#{order.orderNumber}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 600 }}>{order.customer?.name || 'Cash Guest'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Table {order.table?.number || '--'}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>{formatCurrency(order.subtotal)}</td>
                                            <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(order.taxAmount)}</td>
                                            <td style={{ padding: '1rem' }}>{formatCurrency(order.serviceChargeAmount)}</td>
                                            <td style={{ padding: '1rem', fontWeight: 700 }}>{formatCurrency(order.totalAmount)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cancelled Focus */}
                {cancelledOrders.length > 0 && (
                    <div className="premium-glass" style={{ marginTop: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1.25rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={18} /> Cancelled Orders ({cancelledOrders.length})
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {cancelledOrders.map(c => (
                                <div key={c.id} style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)', fontSize: '0.8rem' }}>
                                    <span style={{ fontWeight: 800 }}>#{c.orderNumber}</span> - {formatCurrency(c.totalAmount)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderVATSummary = () => {
        if (!reportData) return null;
        // VAT summary API returns a flat object
        const s = reportData;

        return (
            <div className="animate-fade">
                <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
                    <div className="stat-card">
                        <span className="stat-label">{user?.client?.useTax ? 'Total Sales (Taxable)' : 'Total Net Sales'}</span>
                        <span className="stat-value">{formatCurrency(s.totalTaxableAmount || 0)}</span>
                    </div>
                    <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                        <span className="stat-label">{user?.client?.useTax ? 'VAT Collected (Output Tax)' : 'Total Taxes Collected'}</span>
                        <span className="stat-value" style={{ color: 'var(--primary)' }}>{formatCurrency(s.totalVATCollected || 0)}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Monthly Gross Total</span>
                        <span className="stat-value">{formatCurrency(s.totalGrandTotal || 0)}</span>
                    </div>
                </div>

                <div className="premium-glass">
                    <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>VAT Summary Overview</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.15rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Completed Orders</span>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{s.totalInvoices || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.15rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{user?.client?.useTax ? 'Sales Subject to VAT (13%)' : 'Total Revenue (Net)'}</span>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{formatCurrency(s.totalTaxableAmount || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.15rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Service Charge Collected</span>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{formatCurrency(s.totalServiceCharge || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', background: 'var(--primary-glow)', borderRadius: '14px', border: '1px solid var(--primary)', marginTop: '0.5rem' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '1.05rem' }}>{user?.client?.useTax ? 'Estimated VAT Remittance' : 'Total Tax Obligations'}</span>
                            <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.5rem' }}>{formatCurrency(s.totalVATCollected || 0)}</span>
                        </div>
                    </div>
                    
                    <p style={{ marginTop: '2.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={16} /> * This summary calculates output tax from all completed sales records in the selected period.
                    </p>
                </div>
            </div>
        );
    };

    const renderMonthlySummary = () => {
        if (!reportData || !reportData.dailyBreakdown) return null;
        const { totalOrders, totalRevenue, totalTax, dailyBreakdown } = reportData;

        return (
            <div className="animate-fade">
                <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
                    <div className="stat-card">
                        <span className="stat-label">Monthly Transaction Count</span>
                        <span className="stat-value">{totalOrders}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Total Monthly Revenue</span>
                        <span className="stat-value">{formatCurrency(totalRevenue)}</span>
                    </div>
                    <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                        <span className="stat-label">{user?.client?.useTax ? 'Estimated Monthly VAT' : 'Monthly Taxes'}</span>
                        <span className="stat-value" style={{ color: 'var(--primary)' }}>{formatCurrency(totalTax)}</span>
                    </div>
                </div>

                <div className="premium-glass" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ margin: 0, fontWeight: 800 }}>Monthly Performance Breakdown</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'var(--glass-shine)', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '1rem 1.5rem' }}>Date</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Orders</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Net Sales</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>VAT</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Grand Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyBreakdown.map((day, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)', fontSize: '0.95rem' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{new Date(day.date).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>{day.orders}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>{formatCurrency(day.subtotal)}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(day.tax)}</td>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>{formatCurrency(day.total)}</td>
                                    </tr>
                                ))}
                                {dailyBreakdown.length === 0 && (
                                    <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No sales data available for this month.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>
                        Sales & Tax Reports
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Internal Daily Sales Register & Financial Records (Bikri Khata)</p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={handlePrint} className="premium-glass" style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                        <Printer size={18} /> Print Records
                    </button>
                </div>
            </div>

            {/* Legal Disclaimer Alert */}
            <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                borderRadius: '12px', 
                padding: '1rem 1.5rem', 
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <ShieldCheck color="#ef4444" size={24} />
                <div>
                    <strong style={{ color: '#ef4444', display: 'block', fontSize: '0.9rem' }}>INTERNAL MANAGEMENT RECORDS ONLY</strong>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        These reports (Bikri Khata) are for internal business management and accounting. 
                        RestroBaba is in a <strong>pre-certification phase</strong> and is not an IRD-certified electronic billing system. 
                        Always maintain your physical records for official audit purposes.
                    </p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="billing-controls" style={{ marginBottom: '2rem' }}>
                <div className="view-toggle">
                    <button 
                        className={`toggle-btn ${activeTab === 'daily' ? 'active' : ''}`}
                        onClick={() => setActiveTab('daily')}
                    >
                        <Calendar size={16} /> Daily Sales Register
                    </button>
                    <button 
                        className={`toggle-btn ${activeTab === 'vat-summary' ? 'active' : ''}`}
                        onClick={() => setActiveTab('vat-summary')}
                    >
                        <ShieldCheck size={16} /> VAT Summary
                    </button>
                    <button 
                        className={`toggle-btn ${activeTab === 'monthly' ? 'active' : ''}`}
                        onClick={() => setActiveTab('monthly')}
                    >
                        <BarChart3 size={16} /> Monthly History
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Filter size={18} color="var(--text-muted)" />
                    {activeTab === 'daily' ? (
                        <input 
                            type="date" 
                            className="form-input" 
                            style={{ padding: '0.5rem 1rem', width: '200px' }}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    ) : (
                        <input 
                            type="month" 
                            className="form-input" 
                            style={{ padding: '0.5rem 1rem', width: '200px' }}
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                </div>
            ) : (
                <>
                    {activeTab === 'daily' && renderDailyRegister()}
                    {activeTab === 'vat-summary' && renderVATSummary()}
                    {activeTab === 'monthly' && renderMonthlySummary()}
                </>
            )}

            {/* Pre-Certification Audit Disclaimer */}
            <div style={{ marginTop: '4rem', padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.8, background: 'rgba(212, 175, 55, 0.02)', borderRadius: '12px' }}>
                <ShieldCheck size={32} color="var(--primary)" />
                <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>Internal Management Tool</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RestroBaba Billing System v2.1 | Pre-Certification Version - Not for Official Fiscal Reporting</div>
                </div>
            </div>
        </div>
    );
};

export default TaxReports;
