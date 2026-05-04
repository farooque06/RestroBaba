import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';
import { Plus, Loader2, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OrderTaking from '../components/OrderTaking';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { initSocket, disconnectSocket } from '../services/socket';
import SplitBillModal from '../components/SplitBillModal';
import Receipt from '../components/Receipt';
import { formatWhatsAppReceipt } from '../utils/whatsappFormatter';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Sub-components
import SummaryStats from './TableManagement/SummaryStats';
import FilterBar from './TableManagement/FilterBar';
import TableGrid from './TableManagement/TableGrid';
import AddTableModal from './TableManagement/AddTableModal';
import QRModal from './TableManagement/QRModal';
import TransferModal from './TableManagement/TransferModal';
import CheckoutOverlay from './TableManagement/CheckoutOverlay';

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
    const [processingPayment, setProcessingPayment] = useState(false);
    const receiptRef = useRef(null);

    useEffect(() => {
        fetchTables();

        const clientId = user?.clientId || localStorage.getItem('restroClientId');
        if (clientId) {
            const socket = initSocket(clientId);

            socket.on('ORDER_NEW', () => {
                fetchTables(true);
            });

            socket.on('ORDER_UPDATE', () => {
                fetchTables(true);
            });

            socket.on('ORDER_ITEM_UPDATE', (data) => {
                if (data.status === 'Ready') {
                    const msg = new SpeechSynthesisUtterance(`Table ${data.tableNumber}, ${data.itemName} is ready`);
                    window.speechSynthesis.speak(msg);

                    if (window.navigator.vibrate) {
                        window.navigator.vibrate([200, 100, 200]);
                    }

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
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);

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
                setCheckoutOrder({ ...updatedOrder, tableNumber: checkoutOrder?.tableNumber || updatedOrder.table?.number });
                fetchTables(true);
            }
        } catch (err) {
            toast.error('Failed to link guest');
        }
    };

    const processPayment = async (orderId) => {
        if (processingPayment) return;
        setProcessingPayment(true);
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
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleTransferTable = async (targetTable) => {
        const token = localStorage.getItem('restroToken');
        try {
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
                toast.error('Failed to generate PDF');
            } finally {
                setPrintingOrder(null);
            }
        }, 300);
    };

    const handleWhatsApp = async (order, customPhone) => {
        const phoneToSend = customPhone || customerPhone;
        
        if (!phoneToSend || phoneToSend.length < 10) {
            setShowPhonePrompt(true);
            toast.error('Please enter a valid phone number');
            return;
        }

        const message = formatWhatsAppReceipt(order, { name: user?.clientName });
        let phone = phoneToSend.replace(/\D/g, '');
        if (phone.length === 10) phone = '977' + phone;

        // Silent background capture & link
        performAutoCapture(order.id, phoneToSend);
        
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        toast.success('WhatsApp link opened');
    };

    const performAutoCapture = async (orderId, phoneInput) => {
        if (!phoneInput || phoneInput.length < 10) return;
        try {
            const token = localStorage.getItem('restroToken');
            let phone = phoneInput.replace(/\D/g, '');
            if (phone.length === 10) phone = '977' + phone;

            const custRes = await fetch(`${API_BASE_URL}/api/customers/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ phone, name: `Guest ${phone.slice(-4)}` })
            });
            const customer = await custRes.json();

            if (custRes.ok && customer.id) {
                // Silently link to order
                await fetch(`${API_BASE_URL}/api/orders/${orderId}/customer`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ customerId: customer.id })
                });
                fetchTables(true); // Sync UI
            }
        } catch (err) {
            console.error('Auto-capture failed:', err);
        }
    };

    const filteredTables = tables.filter((t) => filter === 'All' || t.status === filter);
    const availCount = tables.filter(t => t.status === 'Available').length;
    const occCount = tables.filter(t => t.status === 'Occupied').length;
    const resCount = tables.filter(t => t.status === 'Reserved').length;

    const maxTables = user?.client?.subscriptionPlan?.maxTables || 10;
    const capacityPercentage = Math.min((tables.length / maxTables) * 100, 100);

    if (loading) {
        return (
            <div className="page-container flex-center" style={{ height: '100vh' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading floor plan...</p>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade">
            {/* Header */}
            <div className="tm-header-new">
                <div className="tm-header-info">
                    <div className="tm-title-row">
                        <h1>Floor Plan</h1>
                        <div className="tm-capacity-pill">
                            <div className="tm-capacity-bar-mini">
                                <div 
                                    className="tm-capacity-fill-mini" 
                                    style={{ 
                                        width: `${capacityPercentage}%`,
                                        background: tables.length >= maxTables ? 'var(--danger)' : 'var(--primary)'
                                    }} 
                                />
                            </div>
                            <span>{tables.length}/{maxTables} <small>Tables</small></span>
                        </div>
                    </div>
                    <p className="tm-subtitle">
                        Live occupancy for <strong style={{ color: 'var(--primary)' }}>{user?.clientName}</strong>
                    </p>
                </div>

                <div className="tm-header-actions">
                    <button 
                        onClick={() => setSelectedTable({ id: 'takeaway', number: 'Takeaway', type: 'TAKEAWAY' })} 
                        className="tm-action-pill takeaway"
                    >
                        <ShoppingCart size={18} />
                        <span>Takeaway</span>
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="tm-action-pill add"
                        disabled={tables.length >= maxTables}
                    >
                        <Plus size={18} />
                        <span>Add Table</span>
                    </button>
                </div>
            </div>

            <SummaryStats availCount={availCount} occCount={occCount} resCount={resCount} />
            
            <FilterBar filter={filter} setFilter={setFilter} />

            {error && <div className="error-message">{error}</div>}

            <TableGrid 
                tables={filteredTables}
                currentTime={currentTime}
                filter={filter}
                onQrClick={setQrModalTable}
                onTransferClick={(table) => {
                    setTableToTransfer(table);
                    setIsTransferModalOpen(true);
                }}
                onDeleteClick={deleteTable}
                onSelectTable={setSelectedTable}
                onToggleReservation={toggleReservation}
                onHandleBill={handleBill}
            />

            {/* Modals & Overlays */}
            {selectedTable && (
                <OrderTaking
                    table={selectedTable}
                    onClose={() => setSelectedTable(null)}
                    onOrderPlaced={() => fetchTables(true)}
                />
            )}

            <CheckoutOverlay 
                order={checkoutOrder}
                user={user}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                showPhonePrompt={showPhonePrompt}
                setShowPhonePrompt={setShowPhonePrompt}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                onProcessPayment={processPayment}
                processingPayment={processingPayment}
                onWhatsApp={handleWhatsApp}
                onPrint={(order) => { performAutoCapture(order.id); handlePrint(order); }}
                onDownload={(order) => { performAutoCapture(order.id); handleDownload(order); }}
                onSplit={setSplitOrder}
                onLinkCustomer={linkCustomerToOrder}
                onClose={() => { setCheckoutOrder(null); setShowPhonePrompt(false); }}
            />

            <AddTableModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddTable}
                newTable={newTable}
                setNewTable={setNewTable}
            />

            <QRModal 
                table={qrModalTable}
                onClose={() => setQrModalTable(null)}
                user={user}
            />

            <TransferModal 
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                tables={tables}
                tableToTransfer={tableToTransfer}
                onTransfer={handleTransferTable}
            />

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

            {/* Hidden Receipt Area for Printing - Isolated from main UI */}
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
                                businessAddress: user?.client?.businessAddress,
                                businessPhone: user?.client?.businessPhone,
                                panNumber: user?.client?.panNumber,
                                taxMode: user?.client?.taxMode,
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