import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, CreditCard, QrCode, MessageCircle, Printer, Split, Download, UserPlus, Users, X, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import CustomerSelectionModal from '../../components/CustomerSelectionModal';
import '../../styles/components/checkout-overlay.css';

const CheckoutOverlay = ({ 
    order, 
    user, 
    paymentMethod, 
    setPaymentMethod, 
    showPhonePrompt, 
    setShowPhonePrompt, 
    customerPhone, 
    setCustomerPhone, 
    onProcessPayment,
    onWhatsApp,
    onPrint,
    onDownload, 
    onSplit, 
    onLinkCustomer,
    onClose,
    processingPayment
}) => {
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    if (!order) return null;

    const activeItems = order.items?.filter(i => i.status !== 'Waste') || [];
    const itemCount = activeItems.reduce((s, i) => s + i.quantity, 0);

    return createPortal(
        <div className="checkout-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="checkout-sheet">
                {/* Header */}
                <div className="checkout-header">
                    <div>
                        <h2 className="checkout-title">Checkout</h2>
                        <p className="checkout-subtitle">
                            Table {order.tableNumber} · #{order.id?.slice(-6).toUpperCase()}
                        </p>
                    </div>
                    <button className="checkout-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="checkout-body">
                    {/* Guest Section */}
                    <div className="checkout-section">
                        {order.customer ? (
                            <div className="checkout-guest-card">
                                <div className="checkout-guest-info">
                                    <div className="checkout-guest-avatar">
                                        <Users size={14} />
                                    </div>
                                    <div>
                                        <div className="checkout-guest-name">{order.customer.name}</div>
                                        <div className="checkout-guest-phone">{order.customer.phone}</div>
                                    </div>
                                </div>
                                <button className="checkout-guest-remove" onClick={() => onLinkCustomer(order.id, null)}>
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <button className="checkout-add-guest" onClick={() => setShowCustomerSearch(true)}>
                                <UserPlus size={15} />
                                <span>Link Guest</span>
                            </button>
                        )}
                    </div>

                    {/* Items */}
                    <div className="checkout-section">
                        <div className="checkout-section-label">{itemCount} Items</div>
                        <div className="checkout-items">
                            {activeItems.map(item => (
                                <div key={item.id} className="checkout-item">
                                    <span className="checkout-item-qty">{item.quantity}×</span>
                                    <span className="checkout-item-name">{item.menuItem?.name || 'Unknown'}</span>
                                    <span className="checkout-item-price">{formatCurrency((item.price || 0) * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="checkout-total-row">
                        <span>Total</span>
                        <span>{formatCurrency(order.totalAmount ?? 0)}</span>
                    </div>

                    {/* Payment Methods */}
                    <div className="checkout-section">
                        <div className="checkout-payment-grid">
                            {[
                                { id: 'Cash', label: 'Cash', icon: DollarSign },
                                { id: 'Card', label: 'Card', icon: CreditCard },
                                { id: 'UPI', label: 'Online', icon: QrCode }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setPaymentMethod(m.id)}
                                    className={`checkout-payment-btn ${paymentMethod === m.id ? 'active' : ''}`}
                                >
                                    <m.icon size={16} />
                                    <span>{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* UPI QR */}
                    {paymentMethod === 'UPI' && (
                        <div className="checkout-qr-section">
                            <div className="checkout-qr-label">SCAN TO PAY</div>
                            {user?.client?.qrCode ? (
                                <div className="checkout-qr-wrap">
                                    <img src={user.client.qrCode} alt="QR" className="checkout-qr-img" />
                                </div>
                            ) : (
                                <div className="checkout-qr-empty">
                                    <QrCode size={28} />
                                    <span>QR not configured</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* WhatsApp Phone Prompt */}
                    {showPhonePrompt && (
                        <div className="checkout-section animate-fade">
                            <label className="checkout-phone-label">CUSTOMER PHONE FOR WHATSAPP</label>
                            <input 
                                type="tel"
                                placeholder="98XXXXXXXX"
                                className="checkout-phone-input"
                                autoFocus
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Fixed Footer Actions */}
                <div className="checkout-footer">
                    <button 
                        onClick={() => onProcessPayment(order.id)} 
                        className="checkout-pay-btn"
                        disabled={processingPayment}
                    >
                        {processingPayment ? (
                            <div className="checkout-spinner" />
                        ) : (
                            <>
                                <DollarSign size={18} />
                                <span>Pay {paymentMethod === 'UPI' ? 'Online' : paymentMethod} · {formatCurrency(order.totalAmount ?? 0)}</span>
                            </>
                        )}
                    </button>

                    <div className="checkout-secondary-actions">
                        <button onClick={() => onWhatsApp(order)} className="checkout-action-btn whatsapp">
                            <MessageCircle size={16} />
                        </button>
                        <button onClick={() => onPrint(order)} className="checkout-action-btn">
                            <Printer size={16} />
                        </button>
                        <button onClick={() => onDownload(order)} className="checkout-action-btn">
                            <Download size={16} />
                        </button>
                        <button onClick={() => onSplit(order)} className="checkout-action-btn">
                            <Split size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {showCustomerSearch && (
                <CustomerSelectionModal
                    orderId={order.id}
                    onClose={() => setShowCustomerSearch(false)}
                    onSelect={(customer) => onLinkCustomer(order.id, customer.id)}
                />
            )}
        </div>,
        document.body
    );
};

export default CheckoutOverlay;
