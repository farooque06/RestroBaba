import React from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, CreditCard, QrCode, MessageCircle, Printer, Split, Download } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

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
    onClose,
    processingPayment
}) => {
    if (!order) return null;

    return createPortal(
        <div className="ol-payment-overlay">
            <div className="ol-payment-sheet">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>Checkout</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Table {order.tableNumber} — Order #{order.id?.slice(-6).toUpperCase()}
                    </p>
                </div>

                <div style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {order.items?.filter(i => i.status !== 'Waste').map(item => (
                        <div key={item.id} className="ol-item-row">
                            <span><span className="qty">{item.quantity}</span>{item.menuItem?.name || 'Unknown'}</span>
                            <span className="price">{formatCurrency((item.price || 0) * item.quantity)}</span>
                        </div>
                    ))}
                </div>

                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>
                        <span>Total</span>
                        <span>{formatCurrency(order.totalAmount ?? 0)}</span>
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
                        <button 
                            onClick={() => onProcessPayment(order.id)} 
                            className="ol-action-btn pay" 
                            disabled={processingPayment}
                            style={{ height: 'auto', padding: '1rem', gridColumn: 'span 2', opacity: processingPayment ? 0.7 : 1, position: 'relative' }}
                        >
                            {processingPayment ? (
                                <>
                                    <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <DollarSign size={18} />
                                    <span>Confirm {paymentMethod === 'UPI' ? 'Online' : paymentMethod} Payment</span>
                                </>
                            )}
                        </button>
                        
                        <button onClick={() => onWhatsApp(order)} className="ol-action-btn" style={{ height: 'auto', padding: '1rem', background: '#25D366', color: 'white', border: 'none' }}>
                            <MessageCircle size={18} />
                            <span>WhatsApp</span>
                        </button>

                        <button onClick={() => onPrint(order)} className="ol-action-btn cook" style={{ height: 'auto', padding: '1rem', border: '1px solid var(--border)' }}>
                            <Printer size={18} />
                            <span>Print</span>
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <button onClick={() => onSplit(order)} className="ol-action-btn cook" style={{ padding: '0.6rem', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                            <Split size={14} />
                            <span>Split bill</span>
                        </button>
                        <button onClick={() => onDownload(order)} className="ol-action-btn cook" style={{ padding: '0.6rem', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                            <Download size={14} />
                            <span>PDF</span>
                        </button>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ width: '100%', marginTop: '1rem' }}>
                        Back
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CheckoutOverlay;
