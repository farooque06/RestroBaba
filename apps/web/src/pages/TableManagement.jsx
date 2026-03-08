import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Users, Clock, Plus, Square, Loader2, Trash2, Edit2, Utensils, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import OrderTaking from '../components/OrderTaking';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Download, X } from 'lucide-react';
import { initSocket, disconnectSocket } from '../services/socket';

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

    useEffect(() => {
        fetchTables();

        const clientId = user?.clientId || localStorage.getItem('restroClientId');
        if (clientId) {
            const socket = initSocket(clientId);

            socket.on('ORDER_NEW', () => {
                console.log('🆕 New order detected, syncing tables...');
                fetchTables(true);
            });

            socket.on('ORDER_UPDATE', () => {
                console.log('🔄 Order update detected, syncing tables...');
                fetchTables(true);
            });
        }

        const interval = setInterval(() => fetchTables(true), 30000); // Increased to 30s since we have sockets now
        return () => {
            clearInterval(interval);
            disconnectSocket();
        };
    }, [user?.clientId]);

    const fetchTables = async (silent = false) => {
        if (!silent) setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/tables`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTables(data);
            } else {
                setError(data.error || 'Failed to fetch tables');
            }
        } catch (err) {
            setError('Connection error');
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
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTable)
            });
            const data = await response.json();
            if (response.ok) {
                setTables([...tables, data]);
                setIsModalOpen(false);
                setNewTable({ number: '', capacity: '' });
                toast.success('Table added successfully');
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
            message: 'Are you sure you want to permanently delete this table? This action cannot be undone.',
            onConfirm: () => performDeleteTable(id)
        });
        setIsConfirmModalOpen(true);
    };

    const performDeleteTable = async (id) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/tables/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setTables(tables.filter(t => t.id !== id));
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
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const order = await response.json();
            if (response.ok && order) {
                // Issue #7: Guard — only allow billing for Served/Ready orders
                if (!['Served', 'Ready'].includes(order.status)) {
                    toast.error(`Cannot bill yet — order is still "${order.status}". Wait until it's Served.`);
                    return;
                }
                setCheckoutOrder({ ...order, tableNumber: table.number });
            } else {
                toast.error('No active order found for this table.');
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
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Paid' })
            });
            if (response.ok) {
                setCheckoutOrder(null);
                fetchTables();
                toast.success('Payment processed successfully');
            }
        } catch (err) {
            toast.error('Payment connection error');
        }
    };

    const filteredTables = tables.filter(t => filter === 'All' || t.status === filter);

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Table Management</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Real-time floor plan for <strong style={{ color: 'var(--text-main)' }}>{user?.clientName}</strong></p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="nav-item active"
                    style={{ border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
                >
                    <Plus size={20} />
                    <span>Add Table</span>
                </button>
            </div>

            <div className="premium-glass" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                {['All', 'Available', 'Occupied', 'Reserved'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '10px',
                            background: filter === status ? 'var(--primary)' : 'var(--glass-shine)',
                            border: '1px solid var(--glass-border)',
                            color: filter === status ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {filteredTables.map(table => (
                    <div
                        key={table.id}
                        className="stat-card"
                        style={{
                            borderLeft: `4px solid ${table.status === 'Available' ? 'var(--accent)' :
                                table.status === 'Occupied' ? 'var(--primary)' : 'var(--warning)'
                                }`,
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem' }}>Table {table.number}</h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cap: {table.capacity} Persons</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setQrModalTable(table)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', opacity: 0.6 }}
                                    title="View QR Code"
                                >
                                    <QrCode size={16} />
                                </button>
                                <button
                                    onClick={() => deleteTable(table.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6 }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={16} color="var(--text-muted)" />
                                <span style={{ fontSize: '0.875rem' }}>{table.status === 'Occupied' ? 'In Use' : 'Ready to seat'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={16} color="var(--text-muted)" />
                                <span style={{ fontSize: '0.875rem' }}>{table.status === 'Available' ? 'Available now' : `Status: ${table.status}`}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {table.status === 'Available' ? (
                                <button
                                    onClick={() => setSelectedTable(table)}
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem',
                                        borderRadius: '10px',
                                        background: 'var(--primary)',
                                        border: 'none',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Seat Guest
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setSelectedTable(table)}
                                        className="premium-glass"
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            borderRadius: '10px',
                                            color: 'white',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        View Order
                                    </button>
                                    <button
                                        onClick={() => handleBill(table)}
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '10px',
                                            background: 'rgba(239, 68, 11, 0.1)',
                                            border: '1px solid rgba(239, 68, 11, 0.2)',
                                            color: 'var(--warning)',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Bill
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Checkout Modal */}
            {checkoutOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div className="premium-glass animate-fade-in" style={{ width: '400px', padding: '2rem', border: '1px solid var(--glass-border)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Final Receipt</h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order #{checkoutOrder.id.slice(-6).toUpperCase()} | Table {checkoutOrder.tableNumber}</p>
                        </div>

                        <div style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                            {checkoutOrder.items.filter(i => i.status !== 'Waste').map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <span>{item.quantity}x {item.menuItem?.name || 'Unknown Item'}</span>
                                    <span>{formatCurrency((item.price || 0) * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: '1rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                                <span>{formatCurrency(checkoutOrder.subtotal || 0)}</span>
                            </div>
                            {checkoutOrder.taxAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>VAT</span>
                                    <span>{formatCurrency(checkoutOrder.taxAmount)}</span>
                                </div>
                            )}
                            {checkoutOrder.serviceChargeAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Service Charge</span>
                                    <span>{formatCurrency(checkoutOrder.serviceChargeAmount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', marginTop: '0.5rem', borderTop: '1px dashed var(--glass-border)', paddingTop: '0.5rem' }}>
                                <span>Grand Total</span>
                                <span>{formatCurrency(checkoutOrder.totalAmount ?? 0)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                onClick={() => processPayment(checkoutOrder.id)}
                                className="nav-item active"
                                style={{ padding: '1rem', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <DollarSign size={20} />
                                Pay with Cash
                            </button>
                            <button
                                onClick={() => setCheckoutOrder(null)}
                                style={{ padding: '1rem', borderRadius: '12px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Taking View */}
            {selectedTable && (
                <OrderTaking
                    table={selectedTable}
                    onClose={() => setSelectedTable(null)}
                    onOrderPlaced={fetchTables}
                />
            )}

            {/* Add Table Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '350px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Add New Table</h2>
                        <form onSubmit={handleAddTable} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                className="auth-input"
                                placeholder="Table Number (e.g. 101)"
                                required
                                value={newTable.number}
                                onChange={e => setNewTable({ ...newTable, number: e.target.value })}
                            />
                            <input
                                className="auth-input"
                                type="number"
                                placeholder="Seating Capacity"
                                required
                                value={newTable.capacity}
                                onChange={e => setNewTable({ ...newTable, capacity: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" className="nav-item active" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Create Table</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {qrModalTable && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
                    <div className="premium-glass animate-fade-in" style={{ width: '450px', padding: '2.5rem', textAlign: 'center', position: 'relative' }}>
                        <button onClick={() => setQrModalTable(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>

                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ background: 'var(--primary)', display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', marginBottom: '1rem' }}>
                                <QrCode size={32} color="white" />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Table {qrModalTable.number}</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Scan to view digital menu</p>
                        </div>

                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', display: 'inline-block', marginBottom: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                            <QRCodeCanvas
                                id={`qr-${qrModalTable.id}`}
                                value={`${window.location.origin}/menu/p/${localStorage.getItem('restroClientId')}/${qrModalTable.id}`}
                                size={220}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                    src: "/logo-icon.png", // Fallback if exists
                                    x: undefined,
                                    y: undefined,
                                    height: 40,
                                    width: 40,
                                    excavate: true,
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => {
                                    const canvas = document.getElementById(`qr-${qrModalTable.id}`);
                                    const url = canvas.toDataURL("image/png");
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = `QR_Table_${qrModalTable.number}.png`;
                                    link.click();
                                    toast.success('Downloading QR Code...');
                                }}
                                className="nav-item active"
                                style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
                            >
                                <Download size={20} />
                                Download PNG
                            </button>
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/menu/p/${localStorage.getItem('restroClientId')}/${qrModalTable.id}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success('Link copied to clipboard!');
                                }}
                                style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}
                            >
                                Copy Link
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

export default TableManagement;

