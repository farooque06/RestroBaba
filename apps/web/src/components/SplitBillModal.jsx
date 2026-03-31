import React, { useState, useEffect } from 'react';
import { X, Users, List, Calculator, CreditCard, DollarSign, Smartphone, CheckCircle2, User, Plus, Minus, Info, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';
import Dropdown from './common/Dropdown';

const SplitBillModal = ({ order, onClose, onPaymentProcessed }) => {
    const [activeTab, setActiveTab] = useState('equal'); // 'equal', 'items', 'custom'
    const [submitting, setSubmitting] = useState(false);

    // Equal Split State
    const [numPeople, setNumPeople] = useState(2);
    const [equalPayments, setEqualPayments] = useState([]);

    // Items Split State
    const [itemAssignments, setItemAssignments] = useState({}); // itemId -> personLabel
    const [itemPayers, setItemPayers] = useState(['Person 1', 'Person 2']);
    const [itemsPayments, setItemsPayments] = useState([]);

    // Custom Split State
    const [customPayers, setCustomPayers] = useState([
        { label: 'Payer 1', amount: 0, method: 'Cash' }
    ]);

    useEffect(() => {
        // Initialize Equal Split Payments
        const amountPerPerson = order.totalAmount / numPeople;
        const initial = Array.from({ length: numPeople }, (_, i) => ({
            label: `Person ${i + 1}`,
            amount: amountPerPerson,
            method: 'Cash'
        }));
        setEqualPayments(initial);
    }, [numPeople, order.totalAmount]);

    const handleEqualPay = async () => {
        await processPayments(equalPayments);
    };

    const handleCustomPay = async () => {
        const total = customPayers.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        if (Math.abs(total - order.totalAmount) > 0.01) {
            toast.error(`Total must equal ${formatCurrency(order.totalAmount)}. Current: ${formatCurrency(total)}`);
            return;
        }
        await processPayments(customPayers);
    };

    const handleItemsPay = async () => {
        // Calculate totals per payer based on assignments
        const payerTotals = {};
        itemPayers.forEach(p => payerTotals[p] = 0);

        // Add tax/service charge proportionally to each item? 
        // For simplicity, we'll split tax/service charge equally among all payers
        const activeItems = order.items.filter(i => i.status !== 'Waste');
        const assignedItems = Object.keys(itemAssignments).length;

        if (assignedItems < activeItems.length) {
            toast.error('Please assign all items before proceeding');
            return;
        }

        activeItems.forEach(item => {
            const payer = itemAssignments[item.id];
            payerTotals[payer] += (item.price * item.quantity);
        });

        const extraChargesPerPayer = (order.taxAmount + order.serviceChargeAmount) / itemPayers.length;

        const finalPayments = itemPayers.map(p => ({
            label: p,
            amount: payerTotals[p] + extraChargesPerPayer,
            method: 'Cash',
            itemIds: activeItems.filter(i => itemAssignments[i.id] === p).map(i => i.id)
        }));

        await processPayments(finalPayments);
    };

    const processPayments = async (payments) => {
        setSubmitting(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${order.id}/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ payments })
            });

            if (response.ok) {
                toast.success('Split payments processed!');
                onPaymentProcessed();
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to process payments');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div className="premium-glass animate-fade-in" style={{ width: '90%', maxWidth: '800px', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Split Bill: #{order.id.slice(-6).toUpperCase()}</h2>
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Total: {formatCurrency(order.totalAmount)}</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '0.5rem' }}>
                    {[
                        { id: 'equal', icon: <Users size={18} />, label: 'Equal Split' },
                        { id: 'items', icon: <List size={18} />, label: 'By Items' },
                        { id: 'custom', icon: <Calculator size={18} />, label: 'Custom Amount' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                                border: 'none',
                                color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                borderRadius: '8px'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {activeTab === 'equal' && (
                        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Split equally among how many people?</p>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
                                    <button onClick={() => setNumPeople(Math.max(2, numPeople - 1))} className="premium-glass" style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>-</button>
                                    <span style={{ fontSize: '3rem', fontWeight: 800 }}>{numPeople}</span>
                                    <button onClick={() => setNumPeople(numPeople + 1)} className="premium-glass" style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>+</button>
                                </div>
                                <h3 style={{ marginTop: '1rem', color: 'var(--primary)' }}>{formatCurrency(order.totalAmount / numPeople)} each</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {equalPayments.map((p, idx) => (
                                    <div key={idx} className="premium-glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={16} />
                                            </div>
                                            <input
                                                value={p.label}
                                                onChange={(e) => {
                                                    const newPayments = [...equalPayments];
                                                    newPayments[idx].label = e.target.value;
                                                    setEqualPayments(newPayments);
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 600, fontSize: '0.9rem', width: '100px', borderBottom: '1px solid transparent' }}
                                                onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary)'}
                                                onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {['Cash', 'Card', 'UPI'].map(method => (
                                                <button
                                                    key={method}
                                                    onClick={() => {
                                                        const newPayments = [...equalPayments];
                                                        newPayments[idx].method = method;
                                                        setEqualPayments(newPayments);
                                                    }}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        background: p.method === method ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                                        border: '1px solid var(--glass-border)',
                                                        color: p.method === method ? 'white' : 'var(--text-muted)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {method}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'items' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <List size={16} />
                                    Assign Items
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {order.items.filter(i => i.status !== 'Waste').map(item => (
                                        <div key={item.id} className="premium-glass" style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.quantity}x {item.menuItem?.name}</span>
                                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(item.price * item.quantity)}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {itemPayers.map(payer => (
                                                    <button
                                                        key={payer}
                                                        onClick={() => setItemAssignments({ ...itemAssignments, [item.id]: payer })}
                                                        style={{
                                                            padding: '0.4rem 0.75rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            background: itemAssignments[item.id] === payer ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                                            border: '1px solid var(--glass-border)',
                                                            color: itemAssignments[item.id] === payer ? 'white' : 'var(--text-muted)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {payer}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={16} />
                                        Payers
                                    </h4>
                                    <button onClick={() => setItemPayers([...itemPayers, `Person ${itemPayers.length + 1}`])} className="premium-glass" style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, border: 'none', cursor: 'pointer' }}>+ Add Person</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {itemPayers.map(payer => {
                                        const payerTotal = order.items
                                            .filter(i => itemAssignments[i.id] === payer && i.status !== 'Waste')
                                            .reduce((sum, i) => sum + (i.price * i.quantity), 0);
                                        const extra = (order.taxAmount + order.serviceChargeAmount) / itemPayers.length;

                                        return (
                                            <div key={payer} className="premium-glass" style={{ padding: '1rem', borderLeft: payerTotal > 0 ? '4px solid var(--primary)' : '4px solid transparent' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 800 }}>{payer}</span>
                                                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(payerTotal + extra)}</span>
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                    Base: {formatCurrency(payerTotal)} + Tax/Serv: {formatCurrency(extra)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                                        <Info size={14} />
                                        <span>Tax & Service charge are split equally across all payers.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'custom' && (
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                                {customPayers.map((p, idx) => (
                                    <div key={idx} className="premium-glass" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Payer Name/Label</label>
                                            <input
                                                value={p.label}
                                                onChange={(e) => {
                                                    const newP = [...customPayers];
                                                    newP[idx].label = e.target.value;
                                                    setCustomPayers(newP);
                                                }}
                                                className="auth-input"
                                                style={{ marginBottom: 0, padding: '0.6rem' }}
                                            />
                                        </div>
                                        <div style={{ width: '140px' }}>
                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Amount</label>
                                            <input
                                                type="number"
                                                value={p.amount}
                                                onChange={(e) => {
                                                    const newP = [...customPayers];
                                                    newP[idx].amount = e.target.value;
                                                    setCustomPayers(newP);
                                                }}
                                                className="auth-input"
                                                style={{ marginBottom: 0, padding: '0.6rem' }}
                                            />
                                        </div>
                                        <div style={{ width: '120px' }}>
                                            <Dropdown 
                                                label="Method"
                                                placeholder="Pay..."
                                                options={['Cash', 'Card', 'UPI']}
                                                value={p.method}
                                                onChange={val => {
                                                    const newP = [...customPayers];
                                                    newP[idx].method = val;
                                                    setCustomPayers(newP);
                                                }}
                                            />
                                        </div>
                                        {customPayers.length > 1 && (
                                            <button onClick={() => setCustomPayers(customPayers.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', marginTop: '1.5rem' }}>
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setCustomPayers([...customPayers, { label: `Payer ${customPayers.length + 1}`, amount: 0, method: 'Cash' }])} className="premium-glass" style={{ width: '100%', padding: '1rem', borderStyle: 'dashed', background: 'transparent', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', marginBottom: '2rem' }}>
                                + Add Another Payer
                            </button>

                            <div className="premium-glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Remaining Balance</span>
                                    {(() => {
                                        const totalAllocated = customPayers.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                                        const remaining = order.totalAmount - totalAllocated;
                                        return (
                                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: Math.abs(remaining) < 0.01 ? 'var(--success)' : (remaining < 0 ? 'var(--danger)' : 'white') }}>
                                                {formatCurrency(remaining)}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Allocated Total</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                                        {formatCurrency(customPayers.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))} / {formatCurrency(order.totalAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    <button
                        onClick={activeTab === 'equal' ? handleEqualPay : (activeTab === 'items' ? handleItemsPay : handleCustomPay)}
                        disabled={submitting}
                        className="nav-item active"
                        style={{ padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                    >
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                        Complete Split Payment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SplitBillModal;
