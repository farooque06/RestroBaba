import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Receipt as ReceiptIcon, CreditCard, DollarSign, Loader2, Printer, Search, FileText, Clock, AlertCircle, Users, Download, Layout } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { initSocket, disconnectSocket } from '../services/socket';
import toast from 'react-hot-toast';
import SplitBillModal from '../components/SplitBillModal';
import Receipt from '../components/Receipt';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { createPortal } from 'react-dom';

const Billing = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'paid'
    const [splitOrder, setSplitOrder] = useState(null);
    const [selectedMethods, setSelectedMethods] = useState({}); // orderId -> method
    const [printingOrder, setPrintingOrder] = useState(null);
    const receiptRef = React.useRef(null);

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
                body: JSON.stringify({
                    status: 'Paid',
                    paymentMethod: selectedMethods[orderId] || 'Cash'
                })
            });
            if (response.ok) {
                toast.success(`Payment processed via ${selectedMethods[orderId] || 'Cash'}`);
                fetchInvoices(true);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to process payment');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    const handlePrint = (order) => {
        setPrintingOrder(order);
        setTimeout(() => {
            window.print();
            setPrintingOrder(null);
        }, 500); // Increased delay for rendering
    };

    const handleDownload = async (order) => {
        setPrintingOrder(order);
        // Wait for component to render
        setTimeout(async () => {
            if (!receiptRef.current) return;
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, canvas.height * 80 / canvas.width] // Match receipt width
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, 80, canvas.height * 80 / canvas.width);
            pdf.save(`Receipt-${order.id.slice(-6).toUpperCase()}.pdf`);
            setPrintingOrder(null);
        }, 500);
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
            {/* Operational Controls */}
            <div className="billing-controls">
                <div className="view-toggle">
                    <button 
                        className={`toggle-btn ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        <AlertCircle size={16} />
                        Pending Payment
                    </button>
                    <button 
                        className={`toggle-btn ${activeTab === 'paid' ? 'active' : ''}`}
                        onClick={() => setActiveTab('paid')}
                    >
                        <ReceiptIcon size={16} />
                        Paid History
                    </button>
                </div>

                <div className="search-bar" style={{ width: '320px', margin: 0 }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Table number or ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="billing-main-container">
                <div className="billing-list-pane">
                    {/* Grid of Pending Orders */}
                    {activeTab === 'pending' && (
                        <div className="billing-grid-mode animate-fade">
                            {filteredPending.map(order => (
                                <div 
                                    key={order.id} 
                                    className={`billing-table-card ${printingOrder?.id === order.id ? 'selected' : ''}`}
                                    onClick={() => setPrintingOrder(order)}
                                >
                                    <div className="table-card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ 
                                                width: '40px', 
                                                height: '40px', 
                                                borderRadius: '10px', 
                                                background: 'var(--primary-glow)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Users size={18} color="var(--primary)" />
                                            </div>
                                            <div>
                                                <div className="table-num">{order.table ? `T-${order.table.number}` : 'Walk-in'}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>#{order.id.slice(-4).toUpperCase()}</div>
                                            </div>
                                        </div>
                                        <div className="table-amount">{formatCurrency(order.totalAmount)}</div>
                                    </div>
                                    
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px' }}>
                                        {order.items.length} items · <Clock size={10} style={{ verticalAlign: 'middle' }} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); processPayment(order.id); }}
                                            className="nav-item active"
                                            style={{ flex: 1, padding: '0.6rem', fontSize: '0.75rem', border: 'none', borderRadius: '8px' }}
                                        >
                                            Quick Pay
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handlePrint(order); }}
                                            className="premium-glass"
                                            style={{ padding: '0.6rem', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Printer size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredPending.length === 0 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                    <DollarSign size={48} style={{ marginBottom: '1rem', opacity: 0.1 }} />
                                    <p>No active orders waiting for payment.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Paid Table (List mode preserved for history) */}
                    {activeTab === 'paid' && (
                        <div className="premium-glass animate-fade" style={{ overflow: 'hidden' }}>
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
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '20px',
                                                    background: order.paymentMethod === 'Split' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    color: order.paymentMethod === 'Split' ? 'var(--primary)' : '#10b981',
                                                    fontWeight: 800,
                                                    border: `1px solid ${order.paymentMethod === 'Split' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                                }}>
                                                    {order.paymentMethod || 'Cash'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                                <button onClick={() => setPrintingOrder(order)} className="premium-glass" style={{ padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                                                    <Search size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right Preview Pane (Desktop) */}
                <div className="billing-preview-pane">
                    <div className="preview-header">
                        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Live Receipt Preview</span>
                        {printingOrder && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handlePrint(printingOrder)} className="premium-glass" style={{ padding: '0.4rem', borderRadius: '6px' }} title="Print Now">
                                    <Printer size={14} />
                                </button>
                                <button onClick={() => setSplitOrder(printingOrder)} className="premium-glass" style={{ padding: '0.4rem', borderRadius: '6px' }} title="Split Bill">
                                    <Users size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', background: activeTab === 'pending' ? 'var(--bg-card)' : 'white' }}>
                        {printingOrder ? (
                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ border: activeTab === 'pending' ? '1px dashed var(--border)' : 'none', borderRadius: '8px', padding: activeTab === 'pending' ? '1rem' : 0 }}>
                                    <Receipt
                                        ref={receiptRef}
                                        order={printingOrder}
                                        client={{
                                            name: user?.clientName,
                                            email: user?.email,
                                            taxRate: user?.client?.taxRate,
                                            serviceChargeRate: user?.client?.serviceChargeRate
                                        }}
                                    />
                                </div>
                                
                                {activeTab === 'pending' && (
                                    <div style={{ marginTop: '2rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem', fontWeight: 700, textTransform: 'uppercase' }}>Select Payment Method</span>
                                        <div className="payment-methods-grid">
                                            {[
                                                { id: 'Cash', label: 'Cash', icon: DollarSign },
                                                { id: 'Card', label: 'Card', icon: CreditCard },
                                                { id: 'UPI', label: 'Online', icon: QrCode }
                                            ].map(method => (
                                                <button 
                                                    key={method.id}
                                                    className={`payment-method-btn ${ (selectedMethods[printingOrder.id] || 'Cash') === method.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedMethods({ ...selectedMethods, [printingOrder.id]: method.id })}
                                                >
                                                    <method.icon size={20} />
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{method.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* QR Code Display for Online (UPI) */}
                                        {(selectedMethods[printingOrder.id] || 'Cash') === 'UPI' && (
                                            <div className="premium-glass animate-fade" style={{ 
                                                padding: '1rem', 
                                                marginBottom: '1.5rem', 
                                                textAlign: 'center',
                                                border: '1px solid var(--primary)',
                                                background: 'rgba(59, 130, 246, 0.05)'
                                            }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                                                    Scan to Pay Online
                                                </div>
                                                {user?.client?.qrCode ? (
                                                    <div style={{ background: 'white', padding: '10px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                                                        <img src={user.client.qrCode} alt="Online Payment QR" style={{ width: '150px', height: '150px', objectFit: 'contain' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                        <QrCode size={40} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                                                        <p>QR Code not configured in settings.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => processPayment(printingOrder.id)}
                                            className="nav-item active"
                                            style={{ width: '100%', padding: '1rem', fontSize: '1rem', border: 'none', borderRadius: '12px' }}
                                        >
                                            Process {formatCurrency(printingOrder.totalAmount)}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="preview-placeholder">
                                <FileText size={48} />
                                <p>Select an order from the left to view receipt and process payments.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {splitOrder && (
                <SplitBillModal
                    order={splitOrder}
                    onClose={() => setSplitOrder(null)}
                    onPaymentProcessed={() => fetchInvoices(true)}
                />
            )}

            {/* Hidden Receipt Area for Printing - Improved for capture and print */}
            {createPortal(
                <div 
                    id="printable-receipt-container"
                    style={{ 
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        width: '80mm', 
                        zIndex: -1, 
                        opacity: 0, 
                        pointerEvents: 'none',
                        background: 'white'
                    }}
                >
                    {printingOrder && (
                        <Receipt
                            ref={receiptRef}
                            order={printingOrder}
                            client={{
                                name: user?.clientName,
                                email: user?.email,
                                taxRate: user?.client?.taxRate,
                                serviceChargeRate: user?.client?.serviceChargeRate
                            }}
                        />
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default Billing;
