import React, { useState, useEffect } from 'react';
import { Plus, Settings, Store, Mail, Lock, UserCircle, Key, ShieldCheck, Clock, Calendar, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Dropdown from '../common/Dropdown';
import { API_BASE_URL } from '../../config';

const calculateExpiry = (duration) => {
    const date = new Date();
    if (duration === '12m') date.setFullYear(date.getFullYear() + 1);
    else if (duration === '3m') date.setMonth(date.getMonth() + 3);
    else date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
};

const defaultState = {
    name: '', email: '', adminName: '', adminPassword: '',
    useTax: false, taxRate: 0, useServiceCharge: false, serviceChargeRate: 0,
    plan: 'SILVER', planDuration: '1m',
    subscriptionEnd: calculateExpiry('1m'),
    paymentStatus: 'PAID'
};

const ClientFormModal = ({ isOpen, onClose, mode, initialData, clients, setClients, plans }) => {
    const [formData, setFormData] = useState(defaultState);
    const [submitLoading, setSubmitLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormData({
                    ...initialData,
                    subscriptionEnd: initialData.subscriptionEnd ? new Date(initialData.subscriptionEnd).toISOString().split('T')[0] : calculateExpiry(initialData.planDuration || '1m')
                });
            } else {
                setFormData({ ...defaultState, subscriptionEnd: calculateExpiry('1m') });
            }
        }
    }, [isOpen, mode, initialData]);

    useEffect(() => {
        if (mode === 'add') {
            setFormData(prev => ({ ...prev, subscriptionEnd: calculateExpiry(prev.planDuration) }));
        }
    }, [formData.planDuration, mode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);

        const url = mode === 'add' ? `${API_BASE_URL}/api/clients` : `${API_BASE_URL}/api/clients/${initialData.id}`;
        const method = mode === 'add' ? 'POST' : 'PATCH';

        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                if (mode === 'add') {
                    setClients([data, ...clients]);
                    toast.success('Restaurant onboarded successfully!');
                } else {
                    setClients(clients.map(c => c.id === initialData.id ? data : c));
                    toast.success('Client updated successfully');
                }
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.error || (mode === 'add' ? 'Onboarding failed' : 'Update failed'));
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (!isOpen) return null;

    const isAdd = mode === 'add';

    return (
        <div className="modal-overlay animate-fade" style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-content animate-slideUp premium-glass" style={{ maxWidth: '600px', border: '1px solid var(--border)', padding: '2.5rem' }}>
                <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: 'var(--primary-glow)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifySelf: 'center', marginBottom: '1.25rem', margin: '0 auto 1rem' }}>
                        {isAdd ? <Plus size={32} color="var(--primary)" /> : <Settings size={32} color="var(--primary)" />}
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                        {isAdd ? 'Provision Restaurant' : 'System Orchestration'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                        {isAdd ? 'Deploy a new restaurant node into the ecosystem.' : `Updating core parameters for ${initialData?.name}.`}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Section: Entity Identity */}
                    <div>
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Store size={14} /> Entity Identity
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="input-group">
                                <label>Restaurant Legal Name</label>
                                <div className="input-wrapper">
                                    <Store size={18} />
                                    <input type="text" placeholder="e.g. Royal Orchid Bistro" value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Primary Administrative Email</label>
                                <div className="input-wrapper">
                                    <Mail size={18} />
                                    <input type="email" placeholder="admin@restaurant.com" value={formData.email || ''}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Admin Authentication (Only for Add) */}
                    {isAdd && (
                        <div>
                            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Lock size={14} /> Lead Authentication
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="input-group">
                                    <label>Full Name</label>
                                    <div className="input-wrapper">
                                        <UserCircle size={18} />
                                        <input type="text" placeholder="Primary Owner" value={formData.adminName || ''}
                                            onChange={e => setFormData({ ...formData, adminName: e.target.value })} required={isAdd} />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Secure Password</label>
                                    <div className="input-wrapper">
                                        <Key size={18} />
                                        <input type="password" placeholder="••••••••" value={formData.adminPassword || ''}
                                            onChange={e => setFormData({ ...formData, adminPassword: e.target.value })} required={isAdd} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section: Financial & Tax */}
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                    <input type="checkbox" checked={formData.useTax} onChange={e => setFormData({ ...formData, useTax: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }} />
                                    {isAdd ? 'Enable VAT Compliance' : 'VAT Override'}
                                </label>
                                <div className="input-wrapper" style={{ opacity: formData.useTax ? 1 : 0.4 }}>
                                    <input type="number" step="0.01" placeholder="13" value={formData.taxRate || 0}
                                        onChange={e => setFormData({ ...formData, taxRate: e.target.value })} disabled={!formData.useTax}
                                        style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} />
                                    <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>%</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                    <input type="checkbox" checked={formData.useServiceCharge} onChange={e => setFormData({ ...formData, useServiceCharge: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }} />
                                    Service Charge
                                </label>
                                <div className="input-wrapper" style={{ opacity: formData.useServiceCharge ? 1 : 0.4 }}>
                                    <input type="number" step="0.01" placeholder="10" value={formData.serviceChargeRate || 0}
                                        onChange={e => setFormData({ ...formData, serviceChargeRate: e.target.value })} disabled={!formData.useServiceCharge}
                                        style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} />
                                    <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Subscription Tier */}
                    <div>
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={14} /> Ecosystem Tier
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            {plans.map(p => {
                                const color = p.tier === 'GOLD' ? '#fbbf24' : p.tier === 'DIAMOND' ? '#38bdf8' : '#94a3b8';
                                const isActive = formData.plan === p.tier;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => setFormData({ ...formData, plan: p.tier })}
                                        className={`plan-card-mini ${isActive ? 'active' : ''}`}
                                        style={{
                                            padding: '1.25rem 0.5rem',
                                            borderRadius: '18px',
                                            border: `2px solid ${isActive ? color : 'transparent'}`,
                                            background: isActive ? `${color}15` : 'rgba(255,255,255,0.03)',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{
                                            padding: '8px',
                                            borderRadius: '12px',
                                            background: isActive ? color : 'rgba(255,255,255,0.05)',
                                            color: isActive ? 'black' : 'var(--text-muted)',
                                            transition: 'all 0.2s ease'
                                        }}>
                                            <ShieldCheck size={20} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: isActive ? color : 'var(--text-muted)' }}>{p.tier}</span>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                            Rs. {p.offerMonthly || p.monthlyPrice}/mo
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                            {[
                                { id: '1m', label: 'Monthly' },
                                { id: '3m', label: 'Quarterly' },
                                { id: '12m', label: 'Annual' }
                            ].map(d => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, planDuration: d.id })}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '12px',
                                        border: `1px solid ${formData.planDuration === d.id ? 'var(--primary)' : 'var(--border)'}`,
                                        background: formData.planDuration === d.id ? 'var(--primary-glow)' : 'transparent',
                                        color: formData.planDuration === d.id ? 'var(--primary)' : 'var(--text-muted)',
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section: Lifecycle & Billing */}
                    <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock size={16} /> Lifecycle & Billing
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Subscription Expiry</label>
                                <div className="input-wrapper" style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '16px',
                                    padding: '4px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <Calendar size={18} color="var(--primary)" />
                                    <input
                                        type="date"
                                        value={formData.subscriptionEnd || ''}
                                        onChange={e => setFormData({ ...formData, subscriptionEnd: e.target.value })}
                                        required
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'white',
                                            padding: '12px 0',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            outline: 'none',
                                            width: '100%',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <Dropdown 
                                    label="Payment Status"
                                    placeholder="Select Status..."
                                    options={[
                                        { value: 'PAID', label: '✓ MARK AS PAID' },
                                        { value: 'PENDING', label: '⌛ PENDING' },
                                        ...(!isAdd ? [{ value: 'OVERDUE', label: '⚠ OVERDUE' }] : [])
                                    ]}
                                    value={formData.paymentStatus || 'PAID'}
                                    onChange={val => setFormData({ ...formData, paymentStatus: val })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem' }}>
                        <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: '1rem' }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 2, padding: '1rem', borderRadius: '16px', boxShadow: '0 10px 20px -5px var(--primary-glow)' }}>
                            {submitLoading ? <Loader2 className="animate-spin" /> : (isAdd ? 'Confirm Provisioning' : 'Synchronize Node')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientFormModal;
