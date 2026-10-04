import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { ClipboardList, Clock, CheckCircle, ChefHat, Loader2, Search, XCircle, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { initSocket, disconnectSocket } from '../services/socket';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import CheckoutOverlay from './TableManagement/CheckoutOverlay';
import { formatWhatsAppReceipt } from '../utils/whatsappFormatter';

const OrderList = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [showPhonePrompt, setShowPhonePrompt] = useState(false);
    const [customerPhone, setCustomerPhone] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const fetchRequestId = useRef(0);
    const fetchOrdersRef = useRef(null);

    useEffect(() => {
        const clientId = user?.clientId || localStorage.getItem('restroClientId');
        if (clientId) {
            const socket = initSocket(clientId);

            socket.on('ORDER_NEW', () => fetchOrdersRef.current?.(true));
            socket.on('ORDER_UPDATE', () => fetchOrdersRef.current?.(true));
        }

        const interval = setInterval(() => fetchOrdersRef.current?.(true), 30000);
        return () => {
            clearInterval(interval);
            disconnectSocket();
        };
    }, [user?.clientId]);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    useEffect(() => {
        fetchOrdersRef.current?.();
    }, [page, filter, debouncedSearchQuery]);

    const fetchOrders = async (silent = false) => {
        if (!silent) setLoading(true);
        const requestId = ++fetchRequestId.current;
        const token = localStorage.getItem('restroToken');
        setFetchError('');
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (filter !== 'All') params.set('status', filter);
            if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);

            const response = await fetch(`${API_BASE_URL}/api/orders?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch orders');
            if (requestId !== fetchRequestId.current) return;
            if (!data || Array.isArray(data) || !Array.isArray(data.orders) || !data.pagination) {
                throw new Error('The orders API does not support pagination yet. Deploy the updated API and try again.');
            }

            if (page > data.pagination.totalPages) {
                setPage(data.pagination.totalPages);
                return;
            }
            setOrders(data.orders);
            setPagination(data.pagination);
        } catch (err) {
            console.error('Failed to fetch orders', err);
            if (requestId === fetchRequestId.current) {
                setFetchError(err instanceof Error ? err.message : 'Failed to fetch orders. Please try again.');
            }
        } finally {
            if (requestId === fetchRequestId.current) setLoading(false);
        }
    };
    fetchOrdersRef.current = fetchOrders;

    const updateStatus = async (orderId, status, method = 'Cash') => {
        const token = localStorage.getItem('restroToken');
        setProcessingPayment(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, paymentMethod: method })
            });
            if (response.ok) {
                toast.success(`Order marked as ${status}`);
                fetchOrders(true);
                setPaymentOrder(null);
                setShowPhonePrompt(false);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to update status');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setProcessingPayment(false);
        }
    };

    const linkCustomerToOrder = async (orderId, customerId) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/customer`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customerId })
            });
            if (response.ok) {
                toast.success(customerId ? 'Guest linked!' : 'Guest removed');
                const updatedOrder = await response.json();
                setPaymentOrder(updatedOrder);
                fetchOrders(true);
            }
        } catch (err) {
            toast.error('Failed to link guest');
        }
    };

    const handleWhatsApp = async (order) => {
        if (!customerPhone || customerPhone.length < 10) {
            setShowPhonePrompt(true);
            toast.error('Please enter customer phone number');
            return;
        }

        const message = formatWhatsAppReceipt(order, { name: user?.clientName });
        let phone = customerPhone.replace(/\D/g, '');
        if (phone.length === 10) phone = '977' + phone;

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        toast.success('WhatsApp receipt generated');
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
            case 'Paid': return 'var(--success)';
            case 'Cancelled': return 'var(--text-muted)';
            default: return 'var(--text-muted)';
        }
    };

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
                            <span className="ol-count-badge">{pagination.total}</span>
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
                        onClick={() => {
                            setFilter(s);
                            setPage(1);
                        }}
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
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {/* ── Order Cards Grid ── */}
            <div className="ol-grid">
                {fetchError && (
                    <div className="ol-empty" role="alert">
                        <p>{fetchError}</p>
                    </div>
                )}

                {orders.map((order, idx) => (
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
                                style={{ color: getStatusColor(order.status) }}
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

                {!fetchError && orders.length === 0 && (
                    <div className="ol-empty">
                        <ClipboardList size={48} style={{ opacity: 0.2 }} />
                        <p>
                            {debouncedSearchQuery
                                ? 'No matching orders found.'
                                : filter === 'All'
                                    ? 'No orders found.'
                                    : `No ${filter.toLowerCase()} orders found.`}
                        </p>
                    </div>
                )}
            </div>

            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                        type="button"
                        className="ol-chip"
                        onClick={() => setPage(currentPage => Math.max(1, currentPage - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Page {page} of {pagination.totalPages} ({pagination.total} orders)
                    </span>
                    <button
                        type="button"
                        className="ol-chip"
                        onClick={() => setPage(currentPage => Math.min(pagination.totalPages, currentPage + 1))}
                        disabled={page === pagination.totalPages}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* ── Payment Overlay ── */}
            <CheckoutOverlay 
                order={paymentOrder ? { ...paymentOrder, tableNumber: paymentOrder.table?.number || 'Walk-in' } : null}
                user={user}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                showPhonePrompt={showPhonePrompt}
                setShowPhonePrompt={setShowPhonePrompt}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                onProcessPayment={(id) => updateStatus(id, 'Paid', paymentMethod)}
                processingPayment={processingPayment}
                onWhatsApp={handleWhatsApp}
                onPrint={(order) => { window.print(); }} // Simplified for now
                onDownload={() => {}} // Simplified for now
                onSplit={() => toast.error('Split bill is currently only available from Floor Plan view')}
                onLinkCustomer={linkCustomerToOrder}
                onClose={() => { setPaymentOrder(null); setShowPhonePrompt(false); }}
            />

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
