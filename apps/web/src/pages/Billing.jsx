import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Receipt, CreditCard, DollarSign, Loader2, Printer, Search, FileText, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { initSocket, disconnectSocket } from '../services/socket';
import toast from 'react-hot-toast';

const Billing = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'paid'

    useEffect(() => {
        fetchInvoices();

        const clientId = user?.clientId || localStorage.getItem('restroClientId');
        if (clientId) {
            const socket = initSocket(clientId);
            socket.on('ORDER_UPDATE', () => fetchInvoices(true));
        }

        return () => disconnectSocket();
    }, [user?.clientId]);

    const fetchInvoices = async (silent = false) => {
        if (!silent) setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setOrders(data);
            }
        } catch (err) {
            console.error('Failed to fetch invoices', err);
        } finally {
            setLoading(false);
        }
    };

    const processPayment = async (orderId) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Paid' })
            });
            if (response.ok) {
                toast.success('Payment processed successfully');
                fetchInvoices(true);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to process payment');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    const paidOrders = orders.filter(o => o.status === 'Paid');
    const pendingOrders = orders.filter(o => ['Served', 'Ready'].includes(o.status));

    const filteredPaid = paidOrders.filter(o =>
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.table?.number && o.table.number.toString().includes(search))
    );

    const filteredPending = pendingOrders.filter(o =>
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.table?.number && o.table.number.toString().includes(search))
    );

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Billing & Invoices</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Process payments and view receipt history.</p>
                </div>
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
                <div className="stat-card">
                    <span className="stat-label">Total Revenue (All Time)</span>
                    <span className="stat-value">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Invoices Paid</span>
                    <span className="stat-value">{paidOrders.length}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: pendingOrders.length > 0 ? '4px solid var(--warning)' : undefined }}>
                    <span className="stat-label">Awaiting Payment</span>
                    <span className="stat-value" style={{ color: pendingOrders.length > 0 ? 'var(--warning)' : undefined }}>{pendingOrders.length}</span>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="premium-glass" style={{ padding: '0.5rem', marginBottom: '2rem', display: 'inline-flex', gap: '0.5rem', borderRadius: '12px' }}>
                <button
                    onClick={() => setActiveTab('pending')}
                    style={{
                        padding: '0.6rem 1.5rem',
                        borderRadius: '10px',
                        background: activeTab === 'pending' ? 'var(--primary)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'pending' ? 'white' : 'var(--text-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <AlertCircle size={16} />
                    Pending Payment ({pendingOrders.length})
                </button>
                <button
                    onClick={() => setActiveTab('paid')}
                    style={{
                        padding: '0.6rem 1.5rem',
                        borderRadius: '10px',
                        background: activeTab === 'paid' ? 'var(--primary)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'paid' ? 'white' : 'var(--text-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Receipt size={16} />
                    Paid Invoices ({paidOrders.length})
                </button>
            </div>

            <div className="premium-glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div className="search-bar" style={{ width: '100%', maxWidth: '400px' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search by Order ID or Table Number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>
            </div>

            {/* Pending Payment Section */}
            {activeTab === 'pending' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {filteredPending.map(order => (
                        <div key={order.id} className="stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>#{order.id.slice(-6).toUpperCase()}</h3>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {order.table ? `Table ${order.table.number}` : 'Walk-in'}
                                    </span>
                                </div>
                                <div style={{
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '20px',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    color: 'var(--warning)',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    border: '1px solid rgba(245, 158, 11, 0.2)'
                                }}>
                                    {order.status}
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem', maxHeight: '120px', overflowY: 'auto' }}>
                                {order.items.filter(i => i.status !== 'Waste').map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                        <span>{item.quantity}x {item.menuItem?.name || 'Unknown'}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{formatCurrency((item.price || 0) * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                                {order.taxAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        <span>VAT</span>
                                        <span>{formatCurrency(order.taxAmount)}</span>
                                    </div>
                                )}
                                {order.serviceChargeAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        <span>Service</span>
                                        <span>{formatCurrency(order.serviceChargeAmount)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                                    <span>Total</span>
                                    <span>{formatCurrency(order.totalAmount ?? 0)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => processPayment(order.id)}
                                className="nav-item active"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <DollarSign size={18} />
                                Mark as Paid
                            </button>
                        </div>
                    ))}
                    {filteredPending.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            <DollarSign size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                            <p>No orders awaiting payment.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Paid Invoices Table */}
            {activeTab === 'paid' && (
                <div className="premium-glass" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--glass-shine)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '1.25rem' }}>Order ID</th>
                                <th style={{ padding: '1.25rem' }}>Date & Time</th>
                                <th style={{ padding: '1.25rem' }}>Table</th>
                                <th style={{ padding: '1.25rem' }}>Amount</th>
                                <th style={{ padding: '1.25rem' }}>Method</th>
                                <th style={{ padding: '1.25rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPaid.map(order => (
                                <tr key={order.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '1.25rem', fontSize: '0.9rem', fontWeight: 600 }}>#{order.id.slice(-6).toUpperCase()}</td>
                                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>{order.table ? `Table ${order.table.number}` : 'Walk-in'}</td>
                                    <td style={{ padding: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(order.totalAmount ?? 0)}</td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 600 }}>Cash</span>
                                    </td>
                                    <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                        <button className="premium-glass" style={{ padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', marginRight: '0.5rem' }}>
                                            <Printer size={16} />
                                        </button>
                                        <button className="premium-glass" style={{ padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                                            <FileText size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredPaid.length === 0 && (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Receipt size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                            <p>No paid invoices found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Billing;
