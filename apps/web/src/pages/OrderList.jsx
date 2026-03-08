import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { ClipboardList, Clock, CheckCircle, ChefHat, Loader2, Search, XCircle, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { initSocket, disconnectSocket } from '../services/socket';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const OrderList = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });
    const [paymentOrder, setPaymentOrder] = useState(null);

    useEffect(() => {
        fetchOrders();

        // Issue #11: Socket integration
        const clientId = user?.clientId || localStorage.getItem('restroClientId');
        if (clientId) {
            const socket = initSocket(clientId);

            socket.on('ORDER_NEW', () => fetchOrders(true));
            socket.on('ORDER_UPDATE', () => fetchOrders(true));
        }

        const interval = setInterval(() => fetchOrders(true), 30000);
        return () => {
            clearInterval(interval);
            disconnectSocket();
        };
    }, [user?.clientId]);

    const fetchOrders = async (silent = false) => {
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
            console.error('Failed to fetch orders', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, status) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                toast.success(`Order marked as ${status}`);
                fetchOrders(true);
                setPaymentOrder(null);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to update status');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    // Issue #6: Cancel order
    const handleCancel = (orderId) => {
        setConfirmAction({
            title: 'Cancel Order?',
            message: 'Are you sure you want to cancel this order? Inventory for cooked items will be restored.',
            onConfirm: () => updateStatus(orderId, 'Cancelled')
        });
        setIsConfirmModalOpen(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'var(--danger)';
            case 'Cooking': return 'var(--warning)';
            case 'Ready': return 'var(--accent)';
            case 'Served': return 'var(--primary)';
            case 'Paid': return '#10b981';
            case 'Cancelled': return '#6b7280';
            default: return 'var(--text-muted)';
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesFilter = filter === 'All' || o.status === filter;
        const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.table?.number?.toString().includes(searchQuery);
        return matchesFilter && matchesSearch;
    });

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Orders & KOT</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Track kitchen preparation and service for <strong style={{ color: 'var(--text-main)' }}>{user?.clientName}</strong></p>
                </div>
            </div>

            <div className="premium-glass" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', overflowX: 'auto' }}>
                {['All', 'Pending', 'Cooking', 'Ready', 'Served', 'Paid', 'Cancelled'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '10px',
                            background: filter === s ? 'var(--primary)' : 'var(--glass-shine)',
                            border: '1px solid var(--glass-border)',
                            color: filter === s ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="search-bar" style={{ width: '350px', marginBottom: '2rem' }}>
                <Search size={18} color="var(--text-muted)" />
                <input
                    type="text"
                    placeholder="Search by Order ID or Table..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ color: 'var(--text-main)' }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {filteredOrders.map(order => (
                    <div key={order.id} className="stat-card" style={{ padding: '1.5rem', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Order #{order.id.slice(-4).toUpperCase()}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={14} color="var(--text-muted)" />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <div style={{
                                padding: '0.4rem 0.8rem',
                                borderRadius: '20px',
                                background: `${getStatusColor(order.status)}20`,
                                color: getStatusColor(order.status),
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: `1px solid ${getStatusColor(order.status)}40`
                            }}>
                                {order.status}
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Items</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {order.items.filter(i => i.status !== 'Waste').map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span>{item.quantity}x {item.menuItem?.name || 'Unknown Item'}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{formatCurrency((item.price || 0) * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Table</p>
                                <p style={{ fontWeight: 700 }}>{order.table?.number || 'Walk-in'}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {(order.taxAmount > 0 || order.serviceChargeAmount > 0) && (
                                    <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <span>Sub:</span>
                                            <span>{formatCurrency(order.subtotal || 0)}</span>
                                        </div>
                                        {order.taxAmount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <span>VAT:</span>
                                                <span>{formatCurrency(order.taxAmount)}</span>
                                            </div>
                                        )}
                                        {order.serviceChargeAmount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <span>SC:</span>
                                                <span>{formatCurrency(order.serviceChargeAmount)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total</p>
                                <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem', lineHeight: 1 }}>{formatCurrency(order.totalAmount ?? 0)}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                            {order.status === 'Pending' && (
                                <>
                                    <button onClick={() => updateStatus(order.id, 'Cooking')} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'var(--glass-shine)', border: '1px solid var(--glass-border)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <ChefHat size={16} />
                                        <span>Start Cooking</span>
                                    </button>
                                    <button onClick={() => handleCancel(order.id)} style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                        <XCircle size={16} />
                                        Cancel
                                    </button>
                                </>
                            )}
                            {order.status === 'Cooking' && (
                                <>
                                    <button onClick={() => updateStatus(order.id, 'Ready')} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'var(--warning)', border: 'none', color: 'black', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <Clock size={16} />
                                        <span>Mark Ready</span>
                                    </button>
                                    <button onClick={() => handleCancel(order.id)} style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                        <XCircle size={16} />
                                    </button>
                                </>
                            )}
                            {order.status === 'Ready' && (
                                <button onClick={() => updateStatus(order.id, 'Served')} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <CheckCircle size={16} />
                                    <span>Served</span>
                                </button>
                            )}
                            {/* Issue #5/#8: Collect Payment for Served orders (walk-in or table) */}
                            {order.status === 'Served' && (
                                <button onClick={() => setPaymentOrder(order)} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <DollarSign size={16} />
                                    <span>Collect Payment</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {filteredOrders.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <ClipboardList size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                        <p>No orders found.</p>
                    </div>
                )}
            </div>

            {/* Payment Modal for walk-in/served orders */}
            {paymentOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div className="premium-glass animate-fade-in" style={{ width: '400px', padding: '2rem', border: '1px solid var(--glass-border)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Collect Payment</h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order #{paymentOrder.id.slice(-6).toUpperCase()} | {paymentOrder.table ? `Table ${paymentOrder.table.number}` : 'Walk-in'}</p>
                        </div>

                        <div style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                            {paymentOrder.items.filter(i => i.status !== 'Waste').map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <span>{item.quantity}x {item.menuItem?.name || 'Unknown'}</span>
                                    <span>{formatCurrency((item.price || 0) * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: '1rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                                <span>{formatCurrency(paymentOrder.subtotal || 0)}</span>
                            </div>
                            {paymentOrder.taxAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>VAT</span>
                                    <span>{formatCurrency(paymentOrder.taxAmount)}</span>
                                </div>
                            )}
                            {paymentOrder.serviceChargeAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Service Charge</span>
                                    <span>{formatCurrency(paymentOrder.serviceChargeAmount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', marginTop: '0.5rem', borderTop: '1px dashed var(--glass-border)', paddingTop: '0.5rem' }}>
                                <span>Grand Total</span>
                                <span>{formatCurrency(paymentOrder.totalAmount ?? 0)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                onClick={() => updateStatus(paymentOrder.id, 'Paid')}
                                className="nav-item active"
                                style={{ padding: '1rem', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <DollarSign size={20} />
                                Confirm Payment
                            </button>
                            <button
                                onClick={() => setPaymentOrder(null)}
                                style={{ padding: '1rem', borderRadius: '12px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer' }}
                            >
                                Back
                            </button>
                        </div>
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

export default OrderList;
