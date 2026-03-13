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
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)' }}>Fetching recent orders...</p>
        </div>
    );

    return (
        <div className="page-container animate-fade">
            {/* ── Header ── */}
            <div className="ol-header">
                <div className="ol-header-top">
                    <div>
                        <h1>
                            Orders & KOT
                            <span className="ol-count-badge">{filteredOrders.length}</span>
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                            Track kitchen preparation for <strong style={{ color: 'var(--text-heading)' }}>{user?.clientName}</strong>
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Filter Chips ── */}
            <div className="ol-filters">
                {['All', 'Pending', 'Cooking', 'Ready', 'Served', 'Paid', 'Cancelled'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`ol-chip${filter === s ? ' active' : ''}`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* ── Search ── */}
            <div className="ol-search">
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by Order ID or Table..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Order Cards Grid ── */}
            <div className="ol-grid">
                {filteredOrders.map((order, idx) => (
                    <div key={order.id} className="ol-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                        {/* Header */}
                        <div className="ol-card-header">
                            <div>
                                <div className="ol-order-id">Order #{order.id.slice(-4).toUpperCase()}</div>
                                <div className="ol-order-time">
                                    <Clock size={12} />
                                    <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <div
                                className="ol-status-badge"
                                style={{
                                    background: `${getStatusColor(order.status)}18`,
                                    color: getStatusColor(order.status),
                                    border: `1px solid ${getStatusColor(order.status)}35`,
                                }}
                            >
                                {['Pending', 'Cooking'].includes(order.status) && <span className="pulse" />}
                                {order.status}
                            </div>
                        </div>

                        {/* Items */}
                        <div className="ol-items">
                            <div className="ol-items-label">Items</div>
                            {order.items.filter(i => i.status !== 'Waste').map(item => (
                                <div key={item.id} className="ol-item-row">
                                    <span>
                                        <span className="qty">{item.quantity}</span>
                                        {item.menuItem?.name || 'Unknown Item'}
                                    </span>
                                    <span className="price">{formatCurrency((item.price || 0) * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="ol-card-footer">
                            <div>
                                <div className="ol-table-label">Table</div>
                                <div className="ol-table-value">{order.table?.number || 'Walk-in'}</div>
                            </div>
                            <div>
                                {(order.taxAmount > 0 || order.serviceChargeAmount > 0) && (
                                    <div style={{ marginBottom: '0.35rem' }}>
                                        <div className="ol-tax-row">
                                            <span>Sub:</span>
                                            <span>{formatCurrency(order.subtotal || 0)}</span>
                                        </div>
                                        {order.taxAmount > 0 && (
                                            <div className="ol-tax-row">
                                                <span>VAT:</span>
                                                <span>{formatCurrency(order.taxAmount)}</span>
                                            </div>
                                        )}
                                        {order.serviceChargeAmount > 0 && (
                                            <div className="ol-tax-row">
                                                <span>SC:</span>
                                                <span>{formatCurrency(order.serviceChargeAmount)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="ol-total-label">Total</div>
                                <div className="ol-total-value">{formatCurrency(order.totalAmount ?? 0)}</div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="ol-card-actions">
                            {order.status === 'Pending' && (
                                <>
                                    <button onClick={() => updateStatus(order.id, 'Cooking')} className="ol-action-btn cook">
                                        <ChefHat size={15} />
                                        <span>Start Cooking</span>
                                    </button>
                                    <button onClick={() => handleCancel(order.id)} className="ol-action-btn cancel" title="Cancel Order">
                                        <XCircle size={15} />
                                    </button>
                                </>
                            )}
                            {order.status === 'Cooking' && (
                                <>
                                    <button onClick={() => updateStatus(order.id, 'Ready')} className="ol-action-btn ready">
                                        <Clock size={15} />
                                        <span>Mark Ready</span>
                                    </button>
                                    <button onClick={() => handleCancel(order.id)} className="ol-action-btn cancel" title="Cancel Order">
                                        <XCircle size={15} />
                                    </button>
                                </>
                            )}
                            {order.status === 'Ready' && (
                                <button onClick={() => updateStatus(order.id, 'Served')} className="ol-action-btn served">
                                    <CheckCircle size={15} />
                                    <span>Served</span>
                                </button>
                            )}
                            {order.status === 'Served' && (
                                <button onClick={() => setPaymentOrder(order)} className="ol-action-btn pay">
                                    <DollarSign size={15} />
                                    <span>Collect Payment</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {filteredOrders.length === 0 && (
                    <div className="ol-empty">
                        <ClipboardList size={48} style={{ opacity: 0.2 }} />
                        <p>{filter === 'All' ? 'No orders found.' : `No ${filter.toLowerCase()} orders found.`}</p>
                    </div>
                )}
            </div>

            {/* ── Payment Modal ── */}
            {paymentOrder && (
                <div className="ol-payment-overlay">
                    <div className="ol-payment-sheet">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>Collect Payment</h2>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Order #{paymentOrder.id.slice(-6).toUpperCase()} | {paymentOrder.table ? `Table ${paymentOrder.table.number}` : 'Walk-in'}
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                            {paymentOrder.items.filter(i => i.status !== 'Waste').map(item => (
                                <div key={item.id} className="ol-item-row">
                                    <span><span className="qty">{item.quantity}</span>{item.menuItem?.name || 'Unknown'}</span>
                                    <span className="price">{formatCurrency((item.price || 0) * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                                <span>{formatCurrency(paymentOrder.subtotal || 0)}</span>
                            </div>
                            {paymentOrder.taxAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>VAT</span>
                                    <span>{formatCurrency(paymentOrder.taxAmount)}</span>
                                </div>
                            )}
                            {paymentOrder.serviceChargeAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Service Charge</span>
                                    <span>{formatCurrency(paymentOrder.serviceChargeAmount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)', marginTop: '0.5rem', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                                <span>Grand Total</span>
                                <span>{formatCurrency(paymentOrder.totalAmount ?? 0)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button onClick={() => updateStatus(paymentOrder.id, 'Paid')} className="ol-action-btn pay" style={{ padding: '0.85rem' }}>
                                <DollarSign size={18} />
                                <span>Confirm Payment</span>
                            </button>
                            <button onClick={() => setPaymentOrder(null)} className="btn-ghost" style={{ width: '100%' }}>
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
