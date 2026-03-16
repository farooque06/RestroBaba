import React, { useState } from 'react';
import { useTheme, themes, themeInfo } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
    Palette,
    User,
    Building2,
    Shield,
    Hash,
    Percent,
    Receipt,
    Save,
    Loader2,
    Info,
    CreditCard,
    Layout,
    QrCode,
    Upload
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';

const SettingsPage = () => {
    const { theme, switchTheme } = useTheme();
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('appearance');

    const FinancialSettings = () => {
        const [settings, setSettings] = useState({
            useTax: false,
            taxRate: 0,
            useServiceCharge: false,
            serviceChargeRate: 0,
            restaurantName: user?.clientName || '',
            qrCode: ''
        });
        const [loading, setLoading] = useState(true);
        const [saving, setSaving] = useState(false);

        React.useEffect(() => {
            fetchSettings();
        }, []);

        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('restroToken');
                const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();

                if (response.ok) {
                    const client = data.user.client;
                    if (client) {
                        setSettings({
                            useTax: client.useTax || false,
                            taxRate: client.taxRate || 0,
                            useServiceCharge: client.useServiceCharge || false,
                            serviceChargeRate: client.serviceChargeRate || 0,
                            restaurantName: client.name || user?.clientName || '',
                            qrCode: client.qrCode || ''
                        });
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const handleSave = async () => {
            setSaving(true);
            try {
                const token = localStorage.getItem('restroToken');
                const response = await fetch(`${API_BASE_URL}/api/clients/settings/me`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(settings)
                });

                if (response.ok) {
                    toast.success('Financial settings updated');
                    await refreshUser();
                } else {
                    const data = await response.json();
                    toast.error(data.error || 'Update failed');
                }
            } catch (err) {
                toast.error('Connection error');
            } finally {
                setSaving(false);
            }
        };
        
        const handleQRUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('image', file);

            const toastId = toast.loading('Uploading QR code...');
            try {
                const token = localStorage.getItem('restroToken');
                const response = await fetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const data = await response.json();

                if (response.ok) {
                    setSettings({ ...settings, qrCode: data.url });
                    toast.success('QR Code uploaded. Click update to save.', { id: toastId });
                } else {
                    toast.error(data.error || 'Upload failed', { id: toastId });
                }
            } catch (err) {
                toast.error('Connection error', { id: toastId });
            }
        };

        if (loading) return (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <Loader2 className="animate-spin" size={20} />
                <span>Retrieving settings...</span>
            </div>
        );

        return (
            <div className="settings-section-card animate-fade">
                <div className="settings-header">
                    <h2>Business & Finance</h2>
                    <p>Configure your restaurant's tax policy and service charges.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    {/* VAT Section */}
                    <div className="premium-glass" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'var(--primary-glow)', padding: '8px', borderRadius: '10px' }}>
                                    <Receipt size={18} color="var(--primary)" />
                                </div>
                                <span style={{ fontWeight: 700 }}>Value Added Tax</span>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={settings.useTax}
                                    onChange={e => setSettings({ ...settings, useTax: e.target.checked })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <div style={{ opacity: settings.useTax ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>VAT Percentage (%)</label>
                            <div className="input-with-icon">
                                <input
                                    type="number"
                                    step="0.01"
                                    className="auth-input"
                                    disabled={!settings.useTax}
                                    value={settings.taxRate}
                                    onChange={e => setSettings({ ...settings, taxRate: e.target.value })}
                                />
                                <Percent size={14} className="input-icon-right" />
                            </div>
                        </div>
                    </div>

                    {/* Service Charge Section */}
                    <div className="premium-glass" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '8px', borderRadius: '10px' }}>
                                    <CreditCard size={18} color="#a855f7" />
                                </div>
                                <span style={{ fontWeight: 700 }}>Service Charge</span>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={settings.useServiceCharge}
                                    onChange={e => setSettings({ ...settings, useServiceCharge: e.target.checked })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <div style={{ opacity: settings.useServiceCharge ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Charge Percentage (%)</label>
                            <div className="input-with-icon">
                                <input
                                    type="number"
                                    step="0.01"
                                    className="auth-input"
                                    disabled={!settings.useServiceCharge}
                                    value={settings.serviceChargeRate}
                                    onChange={e => setSettings({ ...settings, serviceChargeRate: e.target.value })}
                                />
                                <Percent size={14} className="input-icon-right" />
                            </div>
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="premium-glass" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '10px' }}>
                                <QrCode size={18} color="var(--primary)" />
                            </div>
                            <span style={{ fontWeight: 700 }}>Payment QR Code</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ 
                                width: '180px', 
                                height: '180px', 
                                background: 'white', 
                                borderRadius: '12px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                border: '1px solid var(--border)',
                                overflow: 'hidden'
                            }}>
                                {settings.qrCode ? (
                                    <img src={settings.qrCode} alt="Payment QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                                        <QrCode size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                                        <p style={{ fontSize: '0.7rem' }}>No QR Code uploaded</p>
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                    Upload your restaurant's digital payment QR code (GPay, PhonePe, UPI, etc.). 
                                    This will be displayed to customers when they choose "Online" payment method.
                                </p>
                                
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <label className="nav-item active" style={{ 
                                        cursor: 'pointer', 
                                        padding: '0.75rem 1.5rem', 
                                        background: 'var(--bg-input)', 
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-main)',
                                        fontSize: '0.85rem'
                                    }}>
                                        <Upload size={16} />
                                        <span>Change QR Code</span>
                                        <input type="file" hidden accept="image/*" onChange={handleQRUpload} />
                                    </label>
                                    {settings.qrCode && (
                                        <button 
                                            className="btn-ghost" 
                                            onClick={() => setSettings({ ...settings, qrCode: '' })}
                                            style={{ color: '#ef4444' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="nav-item active"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ border: 'none', padding: '0.85rem 2rem', cursor: 'pointer', borderRadius: '12px' }}
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>Update Financial Policy</span>
                    </button>
                </div>
            </div>
        );
    };

    const SubscriptionSettings = () => {
        const [plans, setPlans] = useState([]);
        const [currentPlan, setCurrentPlan] = useState(user?.client?.plan || 'SILVER');
        const [duration, setDuration] = useState('1m'); // '1m', '3m', '12m'
        const [loading, setLoading] = useState(false);
        const [fetchingPlans, setFetchingPlans] = useState(true);

        React.useEffect(() => {
            fetchPlans();
        }, []);

        const fetchPlans = async () => {
            try {
                const token = localStorage.getItem('restroToken');
                const response = await fetch(`${API_BASE_URL}/api/plans`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok) {
                    setPlans(data);
                }
            } catch (err) {
                console.error('Fetch plans error:', err);
            } finally {
                setFetchingPlans(false);
            }
        };

        const handleUpgrade = async (planTier) => {
            if (planTier === currentPlan) return;

            setLoading(true);
            try {
                const token = localStorage.getItem('restroToken');
                const response = await fetch(`${API_BASE_URL}/api/clients/my-shop/upgrade`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ plan: planTier, duration })
                });

                if (response.ok) {
                    const data = await response.json();
                    setCurrentPlan(data.plan);
                    toast.success(`Successfully upgraded to ${planTier}!`);
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    const data = await response.json();
                    toast.error(data.error || 'Upgrade failed');
                }
            } catch (err) {
                toast.error('Connection error');
            } finally {
                setLoading(false);
            }
        };

        if (fetchingPlans) {
            return (
                <div className="settings-section-card animate-fade" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                </div>
            );
        }

        return (
            <div className="settings-section-card animate-fade">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                    <div className="settings-header" style={{ margin: 0 }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Subscription Plans</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Choose the best plan for your restaurant's growth.</p>
                    </div>

                    <div className="premium-glass" style={{ padding: '6px', borderRadius: '14px', display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)' }}>
                        {[
                            { id: '1m', label: 'Monthly' },
                            { id: '3m', label: 'Quarterly' },
                            { id: '12m', label: 'Annually', discount: 'Save 33%' }
                        ].map(d => (
                            <button
                                key={d.id}
                                onClick={() => setDuration(d.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: duration === d.id ? 'var(--primary-gradient)' : 'transparent',
                                    color: duration === d.id ? '#000' : 'var(--text-muted)',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    position: 'relative'
                                }}
                            >
                                {d.label}
                                {d.discount && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        right: '-10px',
                                        background: '#22c55e',
                                        color: '#fff',
                                        fontSize: '0.65rem',
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        boxShadow: '0 4px 12px rgba(34,197,94,0.3)'
                                    }}>
                                        {d.discount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="theme-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                    {plans.map(p => {
                        const isCurrent = currentPlan === p.tier;

                        // Dynamic Price Calculation
                        let price = 0;
                        let isOffer = false;
                        if (duration === '1m') {
                            price = p.offerMonthly || p.monthlyPrice;
                            isOffer = !!p.offerMonthly;
                        } else if (duration === '3m') {
                            price = p.offerQuarterly || p.quarterlyPrice;
                            isOffer = !!p.offerQuarterly;
                        } else {
                            price = p.offerYearly || p.yearlyPrice;
                            isOffer = !!p.offerYearly;
                        }

                        const durationLabel = duration === '1m' ? '/mo' : duration === '3m' ? '/3 mo' : '/yr';
                        const color = p.tier === 'GOLD' ? '#fbbf24' : p.tier === 'DIAMOND' ? '#38bdf8' : '#94a3b8';

                        return (
                            <div
                                key={p.id}
                                className={`premium-glass ${isCurrent ? 'active' : ''}`}
                                style={{
                                    padding: '2.5rem 2rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2rem',
                                    border: isCurrent ? `2px solid ${color}` : '1px solid var(--glass-border)',
                                    background: isCurrent ? `${color}08` : 'rgba(255,255,255,0.02)',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    transform: isCurrent ? 'scale(1.02)' : 'scale(1)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {isCurrent && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '-35px',
                                        background: color,
                                        color: '#000',
                                        fontSize: '0.7rem',
                                        fontWeight: 900,
                                        padding: '4px 40px',
                                        transform: 'rotate(45deg)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                    }}>
                                        CURRENT
                                    </div>
                                )}

                                {p.offerTag && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        background: 'var(--primary-gradient)',
                                        color: '#000',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {p.offerTag}
                                    </div>
                                )}

                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                        {p.name}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: color }}>Rs.</span>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{price.toLocaleString()}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{durationLabel}</span>
                                    </div>
                                    {isOffer && (
                                        <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 700, marginTop: '4px' }}>
                                            {p.discountLabel || 'Promotional Offer'}
                                        </div>
                                    )}

                                    {isCurrent && user?.client?.subscriptionEnd && (
                                        <div style={{ marginTop: '1rem', padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '2px' }}>
                                                Expires On
                                            </div>
                                            <div style={{ fontWeight: 800, color: new Date(user.client.subscriptionEnd) < new Date() ? '#ef4444' : 'var(--text-main)' }}>
                                                {new Date(user.client.subscriptionEnd).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                {new Date(user.client.subscriptionEnd) < new Date() && " (EXPIRED)"}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ height: '1px', background: 'var(--glass-border)' }} />

                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {p.features.map((f, i) => (
                                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Shield size={12} color={color} />
                                            </div>
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleUpgrade(p.tier)}
                                    disabled={loading}
                                    className={`nav-item ${isCurrent ? 'active' : 'active'}`}
                                    style={{
                                        width: '100%',
                                        justifyContent: 'center',
                                        marginTop: 'auto',
                                        padding: '1rem',
                                        borderRadius: '14px',
                                        background: isCurrent ? 'var(--primary-gradient)' : color,
                                        color: '#000',
                                        fontSize: '1rem',
                                        fontWeight: 800,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: isCurrent ? '0 10px 20px -10px var(--primary)' : 'none'
                                    }}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : isCurrent ? 'Renew / Extend Plan' : `Upgrade to ${p.name}`}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const tabs = [
        { id: 'appearance', label: 'Appearance', icon: Palette, role: ['SUPER_ADMIN', 'ADMIN', 'WAITER', 'CHEF'] },
        { id: 'finance', label: 'Business & Finance', icon: Building2, role: ['ADMIN'] },
        { id: 'subscription', label: 'Subscription', icon: CreditCard, role: ['ADMIN'] },
        { id: 'account', label: 'My Account', icon: User, role: ['SUPER_ADMIN', 'ADMIN', 'WAITER', 'CHEF'] },
        { id: 'about', label: 'System Info', icon: Info, role: ['SUPER_ADMIN', 'ADMIN', 'WAITER', 'CHEF'] },
    ];

    const filteredTabs = tabs.filter(tab => tab.role.includes(user?.role));

    return (
        <div className="page-container animate-fade">
            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>System Settings</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Personalize your administrative workspace and operational rules.</p>
            </header>

            <div className="settings-container">
                <nav className="settings-tabs">
                    {filteredTabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <main className="settings-content">
                    {activeTab === 'appearance' && (
                        <div className="settings-section-card animate-fade">
                            <div className="settings-header">
                                <h2>Interface Appearance</h2>
                                <p>Choose a theme that best suits your work environment and eyes.</p>
                            </div>
                            <div className="theme-grid">
                                {Object.keys(themes).map(key => {
                                    const info = themeInfo[key];
                                    const isActive = theme === themes[key];
                                    return (
                                        <div
                                            key={key}
                                            className={`theme-option ${isActive ? 'active' : ''}`}
                                            onClick={() => switchTheme(key)}
                                        >
                                            <div
                                                className="theme-preview"
                                                style={{
                                                    background: `linear-gradient(135deg, ${info.preview[0]} 60%, ${info.preview[1]} 100%)`
                                                }}
                                            />
                                            <div className="theme-name">{info.name}</div>
                                            <div className="theme-desc">{info.desc}</div>
                                            {isActive && (
                                                <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                                                    Currently Active
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && user?.role === 'ADMIN' && <FinancialSettings />}

                    {activeTab === 'subscription' && user?.role === 'ADMIN' && <SubscriptionSettings />}

                    {activeTab === 'account' && (

                        <div className="settings-section-card animate-fade">
                            <div className="settings-header">
                                <h2>Profile Information</h2>
                                <p>View your access level and linked restaurant organization.</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                                <div className="input-group">
                                    <label>User Name</label>
                                    <input className="auth-input" value={user?.name || ''} readOnly style={{ background: 'var(--bg-input)', cursor: 'default' }} />
                                </div>
                                <div className="input-group">
                                    <label>Email Address</label>
                                    <input className="auth-input" value={user?.email || ''} readOnly style={{ background: 'var(--bg-input)', cursor: 'default' }} />
                                </div>
                                <div className="input-group">
                                    <label>Access Role</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ background: 'var(--primary-glow)', padding: '8px', borderRadius: '10px' }}>
                                            <Shield size={18} color="var(--primary)" />
                                        </div>
                                        <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>{user?.role || 'Staff'}</span>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Managing Establishment</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px' }}>
                                            <Building2 size={18} color="var(--text-muted)" />
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user?.clientName || 'N/A'}</span>
                                    </div>
                                </div>

                                {user?.role === 'ADMIN' && (
                                    <div className="input-group" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                        <label>Staff System Access Code</label>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '1.25rem',
                                            padding: '1rem 1.5rem',
                                            background: 'var(--primary-glow)',
                                            border: '2px dashed var(--primary)',
                                            borderRadius: '15px',
                                            marginTop: '0.5rem'
                                        }}>
                                            <Hash size={24} color="var(--primary)" />
                                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                                                {user?.client?.shopCode || '------'}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Shield size={14} />
                                            Required for staff PIN login on tables and kitchen.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="settings-section-card animate-fade">
                            <div className="settings-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ background: 'var(--primary-glow)', padding: '12px', borderRadius: '15px' }}>
                                        <Layout size={32} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>RestroBaba OS</h2>
                                        <p style={{ margin: 0 }}>Cloud Restaurant Management</p>
                                    </div>
                                </div>
                            </div>
                            <div className="premium-glass" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Software Version</span>
                                        <span style={{ fontWeight: 700 }}>2.4.0-pro</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Subscription Plan</span>
                                        <span className={`plan-tag ${user?.client?.plan?.toLowerCase() || 'silver'}`} style={{ marginTop: 0 }}>
                                            {user?.client?.plan || 'SILVER'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Design System</span>
                                        <span style={{ fontWeight: 700 }}>Artisan Glass 2.0</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>License Status</span>
                                        <span style={{ color: '#10b981', fontWeight: 800 }}>Active</span>
                                    </div>
                                </div>
                            </div>
                            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3rem' }}>
                                © 2024 RestroBaba Inc. All rights reserved.
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SettingsPage;
