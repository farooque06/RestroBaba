import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';
import { Users, Clock, Plus, Square, Loader2, Trash2, Edit2, Utensils, DollarSign, TableProperties, MoveHorizontal, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import OrderTaking from '../components/OrderTaking';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Download, X, Split, Printer, MessageCircle } from 'lucide-react';
import { initSocket, disconnectSocket } from '../services/socket';
import SplitBillModal from '../components/SplitBillModal';
import Receipt from '../components/Receipt';
import { formatWhatsAppReceipt } from '../utils/whatsappFormatter';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Calendar, CalendarX } from 'lucide-react';

const TableManagement = () => {
    const { user } = useAuth();
    const [tables, setTables] = useState([]);
    const [filter, setFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTable, setNewTable] = useState({ number: '', capacity: '' });
    const [selectedTable, setSelectedTable] = useState(null);
    const [checkoutOrder, setCheckoutOrder] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });
    const [qrModalTable, setQrModalTable] = useState(null);
    const [splitOrder, setSplitOrder] = useState(null);
    const [printingOrder, setPrintingOrder] = useState(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [tableToTransfer, setTableToTransfer] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [customerPhone, setCustomerPhone] = useState('');
    const [showPhonePrompt, setShowPhonePrompt] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const receiptRef = React.useRef(null);

    useEffect(() => {
        fetchTables();

        const clientId = user?.clientId || localStorage.getItem('restroClientId');
        if (clientId) {
            const socket = initSocket(clientId);

            socket.on('ORDER_NEW', () => {
                console.log('🆕 New order → refreshing tables');
                fetchTables(true);
            });

            socket.on('ORDER_UPDATE', () => {
                console.log('🔄 Order updated → refreshing tables');
                fetchTables(true);
            });

            socket.on('ORDER_ITEM_UPDATE', (data) => {
                console.log('🍽️ Item update:', data);
                if (data.status === 'Ready') {
                    // STAFF BUZZER LOGIC
                    // 1. Audio Alert (Speech)
                    const msg = new SpeechSynthesisUtterance(`Table ${data.tableNumber}, ${data.itemName} is ready`);
                    window.speechSynthesis.speak(msg);

                    // 2. Vibration (if mobile)
                    if (window.navigator.vibrate) {
                        window.navigator.vibrate([200, 100, 200]);
                    }

                    // 3. Visual Toast
                    toast.success(`Table ${data.tableNumber}: ${data.itemName} is READY!`, {
                        icon: '🔔',
                        duration: 6000,
                        position: 'top-right',
                        style: {
                            background: 'var(--primary)',
                            color: '#000',
                            fontWeight: 'bold',
                            border: '2px solid white'
                        }
                    });
                }
                fetchTables(true);
            });
        }

        const interval = setInterval(() => fetchTables(true), 30000);
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000); // Update timers every minute

        return () => {
            clearInterval(interval);
            clearInterval(timeInterval);
            disconnectSocket();
        };
    }, [user?.clientId]);

    const fetchTables = async (silent = false) => {
        if (!silent) setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/tables`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setTables(data);
            } else {
                setError(data.error || 'Failed to fetch tables');
            }
        } catch (err) {
            setError('Connection error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTable = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/tables`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newTable),
            });
            const data = await response.json();
            if (response.ok) {
                setTables([...tables, data]);
                setIsModalOpen(false);
                setNewTable({ number: '', capacity: '' });
                toast.success('Table added');
            } else {
                toast.error(data.error || 'Failed to add table');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    const deleteTable = (id) => {
        setConfirmAction({
            title: 'Delete Table?',
            message: 'This action cannot be undone.',
            onConfirm: () => performDeleteTable(id),
        });
        setIsConfirmModalOpen(true);
    };

    const performDeleteTable = async (id) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/tables/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                setTables(tables.filter((t) => t.id !== id));
                toast.success('Table deleted');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    const handleBill = async (table) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/table/${table.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const order = await response.json();
            if (response.ok && order) {
                if (!['Served', 'Ready'].includes(order.status)) {
                    toast.error(`Cannot bill — order is still "${order.status}".`);
                    return;
                }
                setCheckoutOrder({ ...order, tableNumber: table.number });
            } else {
                toast.error('No active order on this table.');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    const processPayment = async (orderId) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    status: 'Paid',
                    paymentMethod: paymentMethod
                }),
            });
            if (response.ok) {
                setCheckoutOrder(null);
                setShowPhonePrompt(false);
                setCustomerPhone('');
                fetchTables(true);
                toast.success('Payment processed');
            }
        } catch (err) {
            toast.error('Payment error');
        }
    };

    const handleTransferTable = async (targetTable) => {
        const token = localStorage.getItem('restroToken');
        try {
            // Find the active order for the table to transfer
            const orderRes = await fetch(`${API_BASE_URL}/api/orders/table/${tableToTransfer.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const order = await orderRes.json();

            if (!order) {
                toast.error('No active order found to transfer');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/orders/${order.id}/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ targetTableId: targetTable.id }),
            });

            if (response.ok) {
                toast.success(`Transferred to Table ${targetTable.number}`);
                setIsTransferModalOpen(false);
                setTableToTransfer(null);
                fetchTables(true);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Transfer failed');
            }
        } catch (err) {
            toast.error('Connection error during transfer');
        }
    };

    const toggleReservation = async (table) => {
        const newStatus = table.status === 'Reserved' ? 'Available' : 'Reserved';
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/tables/${table.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (response.ok) {
                toast.success(`Table ${table.number} is now ${newStatus}`);
                fetchTables(true);
            } else {
                toast.error('Failed to update table status');
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
        }, 300);
    };

    const handleDownload = async (order) => {
        setPrintingOrder(order);
        setTimeout(async () => {
            if (!receiptRef.current) return;
            try {
                const canvas = await html2canvas(receiptRef.current, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [80, (canvas.height * 80) / canvas.width],
                });
                pdf.addImage(imgData, 'PNG', 0, 0, 80, (canvas.height * 80) / canvas.width);
                pdf.save(`Receipt-${order.id.slice(-6).toUpperCase()}.pdf`);
            } catch (err) {
                console.error('PDF generation failed:', err);
                toast.error('Failed to generate PDF');
            } finally {
                setPrintingOrder(null);
            }
        }, 300);
    };

    const performAutoCapture = async (orderId) => {
        if (!customerPhone || customerPhone.length < 10) return;

        try {
            const token = localStorage.getItem('restroToken');
            let phone = customerPhone.replace(/\D/g, '');
            if (phone.length === 10) phone = '977' + phone;

            // 1. Upsert Customer
            const custRes = await fetch(`${API_BASE_URL}/api/customers/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ phone, name: `Guest ${phone.slice(-4)}` })
            });
            const customer = await custRes.json();

            if (custRes.ok && customer.id) {
                // 2. Link to Order
                await fetch(`${API_BASE_URL}/api/orders/${orderId}/customer`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ customerId: customer.id })
                });
            }
        } catch (err) {
            console.error('Auto-capture failed:', err);
        }
    };

    const handleWhatsApp = async (order) => {
        if (!customerPhone || customerPhone.length < 10) {
            setShowPhonePrompt(true);
            toast.error('Please enter customer phone number');
            return;
        }

        const message = formatWhatsAppReceipt(order, { name: user?.clientName });
        // Standardize phone: remove non-digits, add default country code if missing
        let phone = customerPhone.replace(/\D/g, '');
        if (phone.length === 10) phone = '977' + phone; // Default to Nepal if 10 digits

        // BACKGROUND: Save customer and link to order
        try {
            const token = localStorage.getItem('restroToken');
            // 1. Upsert Customer
            const custRes = await fetch(`${API_BASE_URL}/api/customers/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ phone, name: `Quest ${phone.slice(-4)}` })
            });
            const customer = await custRes.json();

            if (custRes.ok && customer.id) {
                // 2. Link to Order
                await fetch(`${API_BASE_URL}/api/orders/${order.id}/customer`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ customerId: customer.id })
                });
            }
        } catch (err) {
            console.error('Auto-capture failed:', err);
        }

        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        toast.success('WhatsApp receipt generated');
    };

    const handlePrintWithCapture = (order) => {
        performAutoCapture(order.id);
        handlePrint(order);
    };

    const handleDownloadWithCapture = (order) => {
        performAutoCapture(order.id);
        handleDownload(order);
    };

    const filteredTables = tables.filter((t) => filter === 'All' || t.status === filter);

    const availCount = tables.filter(t => t.status === 'Available').length;
    const occCount = tables.filter(t => t.status === 'Occupied').length;
    const resCount = tables.filter(t => t.status === 'Reserved').length;

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                <p style={{ color: 'var(--text-muted)' }}>Loading floor plan...</p>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade">
            {/* ── Header ── */}
            <div className="tm-header">
                <div className="tm-header-top">
                    <div>
                        <h1>Table Management</h1>
                        <p className="tm-subtitle">
                            Real-time floor plan for <strong style={{ color: 'var(--text-heading)' }}>{user?.clientName}</strong>
                        </p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="tm-add-btn" disabled={tables.length >= (user?.client?.subscriptionPlan?.maxTables || 10)}>
                        <Plus size={16} />
                        <span>Add Table</span>
                    </button>
                </div>
                {/* Plan Limit Indicator */}
                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Capacity: <strong style={{ color: tables.length >= (user?.client?.subscriptionPlan?.maxTables || 10) ? 'var(--danger)' : 'var(--text-main)' }}>{tables.length}</strong> / {user?.client?.subscriptionPlan?.maxTables || 10}
                    </div>
                    <div style={{ width: '120px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ 
                            width: `${Math.min((tables.length / (user?.client?.subscriptionPlan?.maxTables || 10)) * 100, 100)}%`, 
                            height: '100%', 
                            background: tables.length >= (user?.client?.subscriptionPlan?.maxTables || 10) ? 'var(--danger)' : 'var(--primary-gradient)',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>
            </div>

            {/* ── Summary Stats ── */}
            <div className="tm-summary-bar">
                <div className="tm-stat-pill">
                    <span className="dot green" />
                    <span className="count">{availCount}</span>
                    <span className="label">Available</span>
                </div>
                <div className="tm-stat-pill">
                    <span className="dot blue" />
                    <span className="count">{occCount}</span>
                    <span className="label">Occupied</span>
                </div>
                <div className="tm-stat-pill">
                    <span className="dot amber" />
                    <span className="count">{resCount}</span>
                    <span className="label">Reserved</span>
                </div>
            </div>

            {/* ── Filter Chips ── */}
            <div className="tm-filters" style={{ marginBottom: '1.25rem' }}>
                {['All', 'Available', 'Occupied', 'Reserved'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`tm-chip${filter === status ? ' active' : ''}`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

            {/* ── Table Cards Grid ── */}
            <div className="tm-grid">
                {filteredTables.map((table, idx) => (
                    <div
                        key={table.id}
                        className={`tm-card status-${table.status.toLowerCase()}`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                        {/* Card top */}
                        <div className="tm-card-top">
                            <div>
                                <div className="tm-card-title">Table {table.number}</div>
                                <div className="tm-card-capacity">
                                    <Users size={13} />
                                    <span>Capacity {table.capacity}</span>
                                </div>
                                {table.status === 'Occupied' && table.activeOrderCreatedAt && (
                                    <div className="tm-card-timer animate-pulse-gentle">
                                        <Clock size={12} />
                                        <span>
                                            {Math.floor((currentTime - new Date(table.activeOrderCreatedAt)) / (1000 * 60))}m
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="tm-card-icons">
                                <button onClick={() => setQrModalTable(table)} className="tm-card-icon-btn" title="QR Code">
                                    <QrCode size={15} />
                                </button>
                                {table.status === 'Occupied' && (
                                    <button onClick={() => {
                                        setTableToTransfer(table);
                                        setIsTransferModalOpen(true);
                                    }} className="tm-card-icon-btn" title="Transfer Guest">
                                        <MoveHorizontal size={15} />
                                    </button>
                                )}
                                <button onClick={() => deleteTable(table.id)} className="tm-card-icon-btn danger" title="Delete">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="tm-card-status">
                            <span className={`status-dot ${table.status === 'Available' ? 'green' : table.status === 'Occupied' ? 'blue' : 'amber'}`} />
                            <span>{table.status === 'Available' ? 'Ready — Available now' : table.status === 'Occupied' ? 'In Use' : 'Reserved'}</span>
                        </div>

                        {/* Actions */}
                        <div className="tm-card-actions">
                            {table.status === 'Available' ? (
                                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setSelectedTable(table)}
                                        className="tm-action-btn seat"
                                        style={{ flex: 1 }}
                                    >
                                        <Utensils size={15} />
                                        <span>Seat Guest</span>
                                    </button>
                                    <button
                                        onClick={() => toggleReservation(table)}
                                        className="tm-action-btn view"
                                        title="Reserve Table"
                                        style={{ 
                                            flex: '0 0 40px', 
                                            height: '40px', 
                                            padding: 0, 
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Calendar size={16} />
                                    </button>
                                </div>
                            ) : table.status === 'Reserved' ? (
                                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setSelectedTable(table)}
                                        className="tm-action-btn seat"
                                        style={{ flex: 1 }}
                                    >
                                        <Utensils size={15} />
                                        <span>Seat Guest</span>
                                    </button>
                                    <button
                                        onClick={() => toggleReservation(table)}
                                        className="tm-action-btn bill"
                                        title="Cancel Reservation"
                                        style={{ 
                                            flex: '0 0 40px', 
                                            height: '40px', 
                                            padding: 0, 
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--warning)',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-input)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <CalendarX size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setSelectedTable(table)}
                                        className="tm-action-btn view"
                                    >
                                        <Edit2 size={15} />
                                        <span>View Order</span>
                                    </button>
                                    <button
                                        onClick={() => handleBill(table)}
                                        className="tm-action-btn bill"
                                    >
                                        <DollarSign size={15} />
                                        <span>Bill</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {filteredTables.length === 0 && (
                    <div className="tm-empty">
                        <TableProperties size={56} style={{ opacity: 0.2 }} />
                        <p>{filter === 'All' ? 'No tables yet. Add your first table.' : `No ${filter.toLowerCase()} tables right now.`}</p>
                    </div>
                )}
            </div>

            {/* ── Order Taking Overlay ── */}
            {selectedTable && (
                <OrderTaking
                    table={selectedTable}
                    onClose={() => setSelectedTable(null)}
                    onOrderPlaced={() => fetchTables(true)}
                />
            )}

            {checkoutOrder && createPortal(
                <div className="ol-payment-overlay">
                    <div className="ol-payment-sheet">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>Checkout</h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Table {checkoutOrder.tableNumber} — Order #{checkoutOrder.id?.slice(-6).toUpperCase()}
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                            {checkoutOrder.items?.filter(i => i.status !== 'Waste').map(item => (
                                <div key={item.id} className="ol-item-row">
                                    <span><span className="qty">{item.quantity}</span>{item.menuItem?.name || 'Unknown'}</span>
                                    <span className="price">{formatCurrency((item.price || 0) * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>
                                <span>Total</span>
                                <span>{formatCurrency(checkoutOrder.totalAmount ?? 0)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                {[
                                    { id: 'Cash', label: 'Cash', icon: DollarSign },
                                    { id: 'Card', label: 'Card', icon: CreditCard },
                                    { id: 'UPI', label: 'Online', icon: QrCode }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setPaymentMethod(m.id)}
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            borderRadius: '10px',
                                            border: `1px solid ${paymentMethod === m.id ? 'var(--primary)' : 'var(--border)'}`,
                                            background: paymentMethod === m.id ? 'var(--primary-glow)' : 'var(--bg-card)',
                                            color: paymentMethod === m.id ? 'var(--primary)' : 'var(--text-muted)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '4px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <m.icon size={16} />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>{m.label}</span>
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'UPI' && (
                                <div className="premium-glass animate-fade" style={{ 
                                    padding: '1rem', 
                                    marginBottom: '0.5rem', 
                                    textAlign: 'center',
                                    border: '1px solid var(--primary)',
                                    background: 'rgba(59, 130, 246, 0.05)'
                                }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                                        SCAN TO PAY ONLINE
                                    </div>
                                    {user?.client?.qrCode ? (
                                        <div style={{ background: 'white', padding: '8px', borderRadius: '10px', display: 'inline-block' }}>
                                            <img src={user.client.qrCode} alt="Online Payment QR" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
                                        </div>
                                    ) : (
                                        <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                            <QrCode size={32} style={{ opacity: 0.2, marginBottom: '0.4rem' }} />
                                            <p>QR Code not set</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {showPhonePrompt ? (
                                <div style={{ marginBottom: '1rem' }} className="animate-fade">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>ENTER CUSTOMER PHONE FOR WHATSAPP</label>
                                    <div className="tm-filters" style={{ margin: 0 }}>
                                        <input 
                                            type="tel"
                                            placeholder="98XXXXXXXX"
                                            className="form-input"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--primary)', borderRadius: '10px', padding: '0.75rem', boxShadow: '0 0 10px var(--primary-glow)' }}
                                            autoFocus
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <button onClick={() => processPayment(checkoutOrder.id)} className="ol-action-btn pay" style={{ height: 'auto', padding: '1rem', gridColumn: 'span 2' }}>
                                    <DollarSign size={18} />
                                    <span>Confirm {paymentMethod === 'UPI' ? 'Online' : paymentMethod} Payment</span>
                                </button>
                                
                                <button onClick={() => handleWhatsApp(checkoutOrder)} className="ol-action-btn" style={{ height: 'auto', padding: '1rem', background: '#25D366', color: 'white', border: 'none' }}>
                                    <MessageCircle size={18} />
                                    <span>WhatsApp</span>
                                </button>

                                <button onClick={() => handlePrintWithCapture(checkoutOrder)} className="ol-action-btn cook" style={{ height: 'auto', padding: '1rem', border: '1px solid var(--border)' }}>
                                    <Printer size={18} />
                                    <span>Print</span>
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <button onClick={() => setSplitOrder(checkoutOrder)} className="ol-action-btn cook" style={{ padding: '0.6rem', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                                    <Split size={14} />
                                    <span>Split bill</span>
                                </button>
                                <button onClick={() => handleDownloadWithCapture(checkoutOrder)} className="ol-action-btn cook" style={{ padding: '0.6rem', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                                    <Download size={14} />
                                    <span>PDF</span>
                                </button>
                            </div>
                            <button onClick={() => {
                                setCheckoutOrder(null);
                                setShowPhonePrompt(false);
                            }} className="btn-ghost" style={{ width: '100%' }}>
                                Back
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Add Table Modal ── */}
            {isModalOpen && createPortal(
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-card" style={{ width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Add New Table</h2>
                        <form onSubmit={handleAddTable} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="input-group">
                                <label>Table Number</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    placeholder="e.g. 1"
                                    value={newTable.number}
                                    onChange={(e) => setNewTable({ ...newTable, number: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Capacity</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    placeholder="e.g. 4"
                                    value={newTable.capacity}
                                    onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Table</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ── QR Modal ── */}
            {qrModalTable && createPortal(
                <div className="modal-overlay" onClick={() => setQrModalTable(null)}>
                    <div className="modal-card" style={{ width: '100%', maxWidth: '340px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>QR Code — Table {qrModalTable.number}</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                            <QRCodeCanvas
                                value={`${window.location.origin}/menu/${user?.clientId}?table=${qrModalTable.number}`}
                                size={200}
                                bgColor="transparent"
                                fgColor="var(--text-main)"
                            />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Scan to view menu for Table {qrModalTable.number}
                        </p>
                        <button onClick={() => setQrModalTable(null)} className="btn-ghost" style={{ width: '100%' }}>Close</button>
                    </div>
                </div>,
                document.body
            )}

            {createPortal(
                <ConfirmModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={confirmAction.onConfirm}
                    title={confirmAction.title}
                    message={confirmAction.message}
                    variant="danger"
                />,
                document.body
            )}

            {splitOrder && createPortal(
                <SplitBillModal
                    order={splitOrder}
                    onClose={() => setSplitOrder(null)}
                    onPaymentProcessed={() => {
                        setSplitOrder(null);
                        fetchTables(true);
                    }}
                />,
                document.body
            )}

            {/* ── Transfer Table Modal ── */}
            {isTransferModalOpen && createPortal(
                <div className="modal-overlay" onClick={() => setIsTransferModalOpen(false)}>
                    <div className="modal-card" style={{ width: '100%', maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
                        {/* ... body content ... */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Shift Table {tableToTransfer?.number}</h2>
                            <button onClick={() => setIsTransferModalOpen(false)} className="btn-ghost" style={{ padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Move guest and active order to an available or reserved table:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', padding: '0.25rem' }}>
                            {tables.filter(t => ['Available', 'Reserved'].includes(t.status) && t.id !== tableToTransfer?.id).map(table => (
                                <button
                                    key={table.id}
                                    onClick={() => handleTransferTable(table)}
                                    className="tm-chip"
                                    style={{
                                        width: '100%',
                                        height: '60px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        background: table.status === 'Reserved' ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-input)',
                                        border: `1px solid ${table.status === 'Reserved' ? 'var(--warning)' : 'var(--border)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        margin: 0,
                                        position: 'relative'
                                    }}
                                >
                                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>{table.number}</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{table.status === 'Reserved' ? 'Reserved' : `Cap: ${table.capacity}`}</span>
                                </button>
                            ))}
                        </div>

                        {tables.filter(t => ['Available', 'Reserved'].includes(t.status) && t.id !== tableToTransfer?.id).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                <TableProperties size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                                <p>No available tables to shift to.</p>
                            </div>
                        )}

                        <div style={{ marginTop: '1.5rem' }}>
                            <button onClick={() => setIsTransferModalOpen(false)} className="btn-ghost" style={{ width: '100%' }}>Cancel</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Hidden print area */}
            {createPortal(
                <div
                    id="printable-receipt-container"
                    style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '80mm', background: 'white' }}
                >
                    {printingOrder && (
                        <Receipt
                            ref={receiptRef}
                            order={printingOrder}
                            client={{
                                name: user?.clientName,
                                email: user?.email,
                                taxRate: user?.client?.taxRate,
                                serviceChargeRate: user?.client?.serviceChargeRate,
                            }}
                        />
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default TableManagement;