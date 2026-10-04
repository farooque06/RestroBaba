import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, CreditCard, QrCode, MessageCircle, Printer, Split, Download, UserPlus, Users, X, ChevronDown, Tag } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { formatCurrency } from '../../utils/formatters';
import CustomerSelectionModal from '../../components/CustomerSelectionModal';
import toast from 'react-hot-toast';
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
    processingPayment,
    onOrderUpdated
}) => {
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [checkoutOrder, setCheckoutOrder] = useState(order);
    const [promotions, setPromotions] = useState([]);
    const [selectedPromotionId, setSelectedPromotionId] = useState(order?.promotionId || '');
    const [manualDiscountInput, setManualDiscountInput] = useState(String(order?.manualDiscountAmount || 0));
    const [savingDiscount, setSavingDiscount] = useState(false);

    useEffect(() => {
        setCheckoutOrder(order);
        setSelectedPromotionId(order?.promotionId || '');
        setManualDiscountInput(String(order?.manualDiscountAmount || 0));
    }, [order]);

    useEffect(() => {
        if (!order?.id) return;
        const token = localStorage.getItem('restroToken');
        fetch(`${API_BASE_URL}/api/promotions/active`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to load promotions');
                if (!Array.isArray(data)) throw new Error('Unexpected promotions response');
                setPromotions(order.promotion && !data.some(promotion => promotion.id === order.promotion.id)
                    ? [...data, order.promotion]
                    : data);
            })
            .catch(error => {
                console.error('Failed to load checkout promotions', error);
                toast.error(error instanceof Error ? error.message : 'Failed to load promotions');
            });
    }, [order?.id]);

    if (!order) return null;

    const billingOrder = checkoutOrder || order;
    const activeItems = billingOrder.items?.filter(i => i.status !== 'Waste') || [];
    const itemCount = activeItems.reduce((s, i) => s + i.quantity, 0);
    const selectedPromotion = promotions.find(promotion => promotion.id === selectedPromotionId);
    const promotionDiscount = selectedPromotion
        ? Math.round(Math.min(
            billingOrder.subtotal,
            selectedPromotion.type === 'PERCENTAGE'
                ? billingOrder.subtotal * selectedPromotion.value / 100
                : selectedPromotion.value
        ) * 100) / 100
        : 0;
    const maxManualDiscount = Math.max(0, billingOrder.subtotal - promotionDiscount);
    const parsedManualDiscount = manualDiscountInput.trim() === '' ? 0 : Number(manualDiscountInput);
    const validManualDiscount = Number.isFinite(parsedManualDiscount) &&
        parsedManualDiscount >= 0 &&
        parsedManualDiscount <= maxManualDiscount;
    const discountsChanged = selectedPromotionId !== (billingOrder.promotionId || '') ||
        !validManualDiscount ||
        parsedManualDiscount !== (billingOrder.manualDiscountAmount || 0);

    const applyDiscounts = async () => {
        if (!validManualDiscount || savingDiscount) return;
        setSavingDiscount(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${billingOrder.id}/discount`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    promotionId: selectedPromotionId || null,
                    manualDiscountAmount: parsedManualDiscount
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update bill discounts');
            const updatedOrder = {
                ...data,
                tableNumber: data.table?.number || billingOrder.tableNumber
            };
            setCheckoutOrder(updatedOrder);
            setManualDiscountInput(String(updatedOrder.manualDiscountAmount || 0));
            onOrderUpdated?.(updatedOrder);
        } catch (error) {
            console.error('Failed to apply checkout discounts', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update bill discounts');
        } finally {
            setSavingDiscount(false);
        }
    };

    return createPortal(
        <div className="checkout-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="checkout-sheet">
                {/* Header */}
                <div className="checkout-header">
                    <div>
                        <h2 className="checkout-title">Checkout</h2>
                        <p className="checkout-subtitle">
                            Table {billingOrder.tableNumber} · #{billingOrder.id?.slice(-6).toUpperCase()}
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
                        {billingOrder.customer ? (
                            <div className="checkout-guest-card">
                                <div className="checkout-guest-info">
                                    <div className="checkout-guest-avatar">
                                        <Users size={14} />
                                    </div>
                                    <div>
                                        <div className="checkout-guest-name">{billingOrder.customer.name}</div>
                                        <div className="checkout-guest-phone">{billingOrder.customer.phone}</div>
                                    </div>
                                </div>
                                <button className="checkout-guest-remove" onClick={() => onLinkCustomer(billingOrder.id, null)}>
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
                    <div className="checkout-discount-panel">
                        <div className="checkout-discount-heading"><Tag size={15} /> Discounts</div>
                        <label>
                            <span>Promotion</span>
                            <select
                                value={selectedPromotionId}
                                onChange={event => setSelectedPromotionId(event.target.value)}
                            >
                                <option value="">No promotion</option>
                                {billingOrder.promotion && !promotions.some(promotion => promotion.id === billingOrder.promotion.id) && (
                                    <option value={billingOrder.promotion.id}>
                                        {billingOrder.promotion.name} (existing)
                                    </option>
                                )}
                                {promotions.map(promotion => (
                                    <option key={promotion.id} value={promotion.id}>
                                        {promotion.name} — {promotion.type === 'PERCENTAGE'
                                            ? `${promotion.value}% off`
                                            : `${formatCurrency(promotion.value)} off`}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span>Additional manual discount</span>
                            <input
                                type="number"
                                min="0"
                                max={maxManualDiscount}
                                step="0.01"
                                inputMode="decimal"
                                value={manualDiscountInput}
                                onChange={event => setManualDiscountInput(event.target.value)}
                            />
                        </label>
                        {!validManualDiscount && (
                            <span className="checkout-discount-error">
                                Discount must be between 0 and {formatCurrency(maxManualDiscount)}.
                            </span>
                        )}
                        <button
                            type="button"
                            className="checkout-apply-discount"
                            onClick={applyDiscounts}
                            disabled={savingDiscount || !validManualDiscount || !discountsChanged}
                        >
                            {savingDiscount ? 'Applying…' : 'Apply discounts to bill'}
                        </button>
                    </div>

                    <div className="checkout-total-breakdown">
                        <div><span>Subtotal</span><span>{formatCurrency(billingOrder.subtotal || 0)}</span></div>
                        {billingOrder.discountAmount > 0 && (
                            <div className="checkout-discount-line">
                                <span>{billingOrder.promotion?.name || 'Promotion discount'}</span>
                                <span>−{formatCurrency(billingOrder.discountAmount)}</span>
                            </div>
                        )}
                        {billingOrder.manualDiscountAmount > 0 && (
                            <div className="checkout-discount-line">
                                <span>Manual discount</span>
                                <span>−{formatCurrency(billingOrder.manualDiscountAmount)}</span>
                            </div>
                        )}
                        {billingOrder.serviceChargeAmount > 0 && (
                            <div><span>Service charge</span><span>{formatCurrency(billingOrder.serviceChargeAmount)}</span></div>
                        )}
                        {billingOrder.taxAmount > 0 && (
                            <div><span>Tax</span><span>{formatCurrency(billingOrder.taxAmount)}</span></div>
                        )}
                    </div>

                    <div className="checkout-total-row">
                        <span>Total</span>
                        <span>{formatCurrency(billingOrder.totalAmount ?? 0)}</span>
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

                    {/* WhatsApp Action Area */}
                    {(showPhonePrompt || billingOrder.customer) && (
                        <div className="checkout-whatsapp-area animate-slide-up">
                            <div className="checkout-whatsapp-input-wrap">
                                <div className="whatsapp-icon">
                                    <MessageCircle size={18} />
                                </div>
                                <input 
                                    type="tel"
                                    placeholder="Customer WhatsApp Number"
                                    className="checkout-whatsapp-input"
                                    value={customerPhone || billingOrder.customer?.phone || ''}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    autoFocus={showPhonePrompt}
                                />
                                <button 
                                    className="checkout-whatsapp-send-btn"
                                    onClick={() => onWhatsApp(billingOrder, customerPhone || billingOrder.customer?.phone)}
                                >
                                    <span>Send Bill</span>
                                    <ChevronDown size={16} className="rotate-270" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed Footer Actions */}
                <div className="checkout-footer">
                    <button
                        onClick={() => onProcessPayment(billingOrder.id)}
                        className="checkout-pay-btn"
                        disabled={processingPayment || savingDiscount || !validManualDiscount || discountsChanged}
                    >
                        {processingPayment ? (
                            <div className="checkout-spinner" />
                        ) : (
                            <>
                                <DollarSign size={18} />
                                <span>Pay {paymentMethod === 'UPI' ? 'Online' : paymentMethod} · {formatCurrency(billingOrder.totalAmount ?? 0)}</span>
                            </>
                        )}
                    </button>

                    <div className="checkout-secondary-actions">
                        {!showPhonePrompt && !billingOrder.customer && (
                            <button onClick={() => setShowPhonePrompt(true)} className="checkout-action-btn whatsapp">
                                <MessageCircle size={16} />
                                <span>WhatsApp Bill</span>
                            </button>
                        )}
                        <button onClick={() => onPrint(billingOrder)} className="checkout-action-btn">
                            <Printer size={16} />
                        </button>
                        <button onClick={() => onDownload(billingOrder)} className="checkout-action-btn">
                            <Download size={16} />
                        </button>
                        <button onClick={() => onSplit(billingOrder)} className="checkout-action-btn">
                            <Split size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {showCustomerSearch && (
                <CustomerSelectionModal
                    orderId={billingOrder.id}
                    onClose={() => setShowCustomerSearch(false)}
                    onSelect={(customer) => onLinkCustomer(billingOrder.id, customer.id)}
                />
            )}
        </div>,
        document.body
    );
};

export default CheckoutOverlay;
