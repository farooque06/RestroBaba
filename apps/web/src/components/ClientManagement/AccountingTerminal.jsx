import React, { useState, useEffect } from 'react';
import { CreditCard, AlertTriangle, Calendar, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config';
import { generateInvoice } from '../../utils/generateInvoice';

const AccountingTerminal = ({ isOpen, onClose, selectedClient, setSelectedClient, plans, fetchClients, searchQuery }) => {
    const [clientPayments, setClientPayments] = useState([]);
    const [paymentPage, setPaymentPage] = useState(1);
    const [hasMorePayments, setHasMorePayments] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amountPaid: '',
        method: 'Bank Transfer',
        transactionId: '',
        remarks: '',
        extendSubscription: false,
        extensionMonths: '1',
        planTier: 'SILVER',
        planDuration: '1m',
        baseAmount: 0,
        discount: 0,
        totalPayable: 0,
        billingMonth: ''
    });

    useEffect(() => {
        if (isOpen && selectedClient) {
            setPaymentForm(prev => ({
                ...prev,
                planTier: selectedClient.plan || 'SILVER',
                planDuration: selectedClient.planDuration || '1m',
                extendSubscription: false,
                amountPaid: '',
                discount: 0,
                remarks: '',
                billingMonth: ''
            }));
            fetchPayments(selectedClient.id, 1, false);
        }
    }, [isOpen, selectedClient]);

    const fetchPayments = async (id, page = 1, append = false) => {
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/clients/${id}/payments?page=${page}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                if (append) {
                    setClientPayments(prev => [...prev, ...data.payments]);
                } else {
                    setClientPayments(data.payments || []);
                }
                setPaymentPage(data.page);
                setHasMorePayments(data.page < data.totalPages);
            }
        } catch (err) {
            console.error('Fetch payments error:', err);
        }
    };

    // Calculate payment details whenever plan or duration changes
    useEffect(() => {
        if (!selectedClient || !isOpen || plans.length === 0) return;
        
        const plan = plans.find(p => 
            p.name?.toLowerCase() === paymentForm.planTier?.toLowerCase() ||
            p.tier?.toLowerCase() === paymentForm.planTier?.toLowerCase()
        );
        
        if (!plan) return;

        let price = 0;
        if (paymentForm.planDuration === '1m') price = plan.monthlyPrice || 0;
        else if (paymentForm.planDuration === '3m') price = plan.quarterlyPrice || 0;
        else if (paymentForm.planDuration === '12m') price = plan.yearlyPrice || 0;

        const discount = parseFloat(paymentForm.discount || 0);
        const payable = Math.max(0, price - discount);

        setPaymentForm(prev => ({
            ...prev,
            baseAmount: price,
            totalPayable: payable,
            amountPaid: (prev.amountPaid === "" || parseFloat(prev.amountPaid) === prev.totalPayable) ? payable.toString() : prev.amountPaid
        }));
    }, [paymentForm.planTier, paymentForm.planDuration, paymentForm.discount, isOpen, selectedClient, plans]);

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);

        const payload = {
            ...paymentForm,
            totalPayable: paymentForm.extendSubscription ? paymentForm.totalPayable : 0,
            clientId: selectedClient.id
        };

        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/clients/${selectedClient.id}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Payment recorded successfully');
                
                const currentClient = data.updatedClient || selectedClient;
                if (data.updatedClient) {
                    setSelectedClient(data.updatedClient);
                }
                
                if (data.payment) {
                    generateInvoice(currentClient, data.payment);
                }
                
                fetchPayments(selectedClient.id);
                fetchClients(searchQuery); 
                
                setPaymentForm(prev => ({
                    ...prev,
                    amountPaid: '',
                    transactionId: '',
                    remarks: '',
                    extendSubscription: false
                }));
            } else {
                const data = await response.json();
                toast.error(data.error || 'Payment recording failed');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay animate-fade" style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-content animate-slideUp premium-glass" style={{ maxWidth: '950px', border: '1px solid var(--border)', padding: '2.5rem', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem' }}>
                
                {/* Column 1: Record Payment */}
                <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <CreditCard size={24} color="var(--primary)" />
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Accounting Terminal</h2>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Record payments & manage subscription for <strong>{selectedClient?.name}</strong>.</p>
                        
                        {selectedClient?.subscriptionEnd && new Date(selectedClient.subscriptionEnd) < new Date() && (
                            <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef444433', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <AlertTriangle color="#ef4444" size={20} />
                                <div>
                                    <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.85rem' }}>SUBSCRIPTION OVERDUE</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Expired approx. {Math.ceil((new Date() - new Date(selectedClient.subscriptionEnd)) / (1000 * 60 * 60 * 24 * 30.44))} month(s) ago.</div>
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '10px' }}>
                            <button 
                                type="button"
                                onClick={() => {
                                    setPaymentForm(prev => ({
                                        ...prev,
                                        extendSubscription: true,
                                        extensionMonths: '1',
                                        amountPaid: '0',
                                        discount: prev.baseAmount,
                                        method: 'Promotional',
                                        remarks: 'Complimentary 1-Month Free Trial Granted'
                                    }));
                                    toast.info('Trial pre-filled. Click Record to finalize.');
                                }}
                                style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b98133', color: '#10b981', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                                🎁 Grant 1-Month Trial
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    setPaymentForm(prev => ({
                                        ...prev,
                                        extendSubscription: false,
                                        amountPaid: '0',
                                        discount: 0,
                                        remarks: 'Account verification / Audit check'
                                    }));
                                }}
                                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                                📝 Audit Only
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label>Subscription Tier</label>
                                <div className="input-wrapper">
                                    <select 
                                        value={paymentForm.planTier}
                                        onChange={e => setPaymentForm({ ...paymentForm, planTier: e.target.value })}
                                        style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', padding: '10px' }}
                                    >
                                        {plans.map(p => <option key={p.id} value={p.name} style={{ background: '#1a1a1a' }}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Duration</label>
                                <div className="input-wrapper">
                                    <select 
                                        value={paymentForm.planDuration}
                                        onChange={e => setPaymentForm({ ...paymentForm, planDuration: e.target.value, extensionMonths: e.target.value === '12m' ? '12' : (e.target.value === '3m' ? '3' : '1') })}
                                        style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', padding: '10px' }}
                                    >
                                        <option value="1m" style={{ background: '#1a1a1a' }}>1 Month</option>
                                        <option value="3m" style={{ background: '#1a1a1a' }}>3 Months</option>
                                        <option value="12m" style={{ background: '#1a1a1a' }}>1 Year (12m)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label>Billing Month</label>
                                <div className="input-wrapper">
                                    <select 
                                        value={paymentForm.billingMonth || ''}
                                        onChange={e => setPaymentForm({ ...paymentForm, billingMonth: e.target.value })}
                                        style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', padding: '10px' }}
                                    >
                                        <option value="" style={{ background: '#1a1a1a' }}>Auto-Detect</option>
                                        {Array.from({ length: 6 }).map((_, i) => {
                                            const d = new Date();
                                            d.setMonth(d.getMonth() + i - 1); // Prev month, This month, and next 4 months
                                            const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                                            return <option key={label} value={label} style={{ background: '#1a1a1a' }}>{label}</option>
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div className="input-group">
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Discount (Rs.)</label>
                                <input 
                                    type="number" 
                                    value={paymentForm.discount} 
                                    onChange={e => setPaymentForm({ ...paymentForm, discount: e.target.value })}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', padding: '4px 10px', borderRadius: '8px', width: '100%', fontWeight: 700 }}
                                />
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)' }}>
                                <span>Base Plan Price:</span>
                                <span>Rs. {(paymentForm.baseAmount || 0).toLocaleString()}</span>
                            </div>
                            {paymentForm.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#fbbf24' }}>
                                    <span>Discount Applied:</span>
                                    <span>- Rs. {(parseFloat(paymentForm.discount) || 0).toLocaleString()}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>Total Payable:</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>Rs. {(paymentForm.totalPayable || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label style={{ color: 'var(--success)', fontWeight: 800 }}>Amount Received (Paid)</label>
                                <div className="input-wrapper" style={{ borderColor: 'var(--success)' }}>
                                    <input type="number" placeholder="0.00" value={paymentForm.amountPaid}
                                        onChange={e => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })} required />
                                </div>
                                
                                {/* Financial Breakdown */}
                                <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                                    {paymentForm.extendSubscription ? (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>For Plan:</span>
                                                <span style={{ fontWeight: 700 }}>Rs. {Math.min(parseFloat(paymentForm.amountPaid || 0), paymentForm.totalPayable).toLocaleString()}</span>
                                            </div>
                                            {parseFloat(paymentForm.amountPaid || 0) > paymentForm.totalPayable && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                                                    <span>Debt Settlement:</span>
                                                    <span style={{ fontWeight: 700 }}>- Rs. {(parseFloat(paymentForm.amountPaid) - paymentForm.totalPayable).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {parseFloat(paymentForm.amountPaid || 0) < paymentForm.totalPayable && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24' }}>
                                                    <span>New Debt Added:</span>
                                                    <span style={{ fontWeight: 700 }}>+ Rs. {(paymentForm.totalPayable - parseFloat(paymentForm.amountPaid || 0)).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                                            <span>Direct Settlement:</span>
                                            <span style={{ fontWeight: 700 }}>Rs. {parseFloat(paymentForm.amountPaid || 0).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Method</label>
                                <div className="input-wrapper">
                                    <select 
                                        value={paymentForm.method}
                                        onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                        style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', padding: '10px' }}
                                    >
                                        <option value="Cash" style={{ background: '#1a1a1a' }}>Cash</option>
                                        <option value="Bank Transfer" style={{ background: '#1a1a1a' }}>Bank Transfer</option>
                                        <option value="eSewa" style={{ background: '#1a1a1a' }}>eSewa</option>
                                        <option value="Khalti" style={{ background: '#1a1a1a' }}>Khalti</option>
                                        <option value="QR" style={{ background: '#1a1a1a' }}>QR</option>
                                        <option value="Promotional" style={{ background: '#1a1a1a' }}>Promotional</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label>Ref ID</label>
                                <div className="input-wrapper">
                                    <input type="text" placeholder="TXN-ID" value={paymentForm.transactionId}
                                        onChange={e => setPaymentForm({ ...paymentForm, transactionId: e.target.value })} />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Remarks</label>
                                <div className="input-wrapper">
                                    <input type="text" placeholder="Notes..." value={paymentForm.remarks}
                                        onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.05)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #10b98122' }}>
                            <input type="checkbox" checked={paymentForm.extendSubscription} onChange={e => setPaymentForm({ ...paymentForm, extendSubscription: e.target.checked })}
                                style={{ width: '18px', height: '18px' }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Extend Subscription by {paymentForm.extensionMonths} month(s)</span>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: '0.8rem' }}>Cancel</button>
                            <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 2, padding: '0.8rem' }}>
                                {submitLoading ? <Loader2 className="animate-spin" /> : 'Finalize Payment'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Column 2: Payment History */}
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Account Statement</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {selectedClient?.balance < 0 ? 'Account Credit: ' : 'Total Debt: '}
                                <strong style={{ color: selectedClient?.balance > 0 ? '#ef4444' : 'var(--success)' }}>
                                    Rs. {Math.abs(selectedClient?.balance || 0).toLocaleString()}
                                </strong>
                            </p>
                        </div>
                        <span className="badge badge-subtle">{clientPayments.length} Entries</span>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
                        {clientPayments.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                                <Clock size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                <p>Clean ledger. No payments yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                                {clientPayments.map(p => (
                                    <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>Rs. {(p.amountPaid || 0).toLocaleString()}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.method} • {p.planTier} ({p.planDuration})</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => generateInvoice(selectedClient, p)}
                                                    title="Download Receipt"
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--primary)', padding: '4px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                </button>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                                    {new Date(p.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                                            <div style={{ color: 'var(--text-muted)' }}>Discount: <span style={{ color: 'white' }}>Rs. {(p.discount || 0).toLocaleString()}</span></div>
                                            <div style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
                                                {p.balance < 0 ? 'Credit: ' : 'Debt: '}
                                                <span style={{ color: p.balance > 0 ? '#fbbf24' : 'var(--success)' }}>
                                                    Rs. {Math.abs(p.balance).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {p.remarks && (p.remarks.includes('[Covers until') || p.remarks.includes('[For:')) ? (
                                            <div style={{ fontSize: '0.75rem', marginTop: '10px', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #3b82f633', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calendar size={14} color="#3b82f6" />
                                                <span style={{ color: '#3b82f6', fontWeight: 800 }}>
                                                    {p.remarks.includes('[For:') ? p.remarks.split('[For: ')[1].split(']')[0] : `Covers until: ${p.remarks.split('[Covers until ')[1].split(']')[0]}`}
                                                </span>
                                            </div>
                                        ) : p.remarks && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px', borderLeft: '2px solid var(--primary)', paddingLeft: '8px' }}>
                                                "{p.remarks}"
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {hasMorePayments && (
                                    <button
                                        onClick={() => fetchPayments(selectedClient.id, paymentPage + 1, true)}
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--primary)',
                                            padding: '0.75rem',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            fontWeight: 700,
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Load Older Transactions
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountingTerminal;
