import React from 'react';
import { useTheme, themes, themeInfo } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Palette, User, Building2, Shield, Hash, Percent, Receipt, Save, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';

const SettingsPage = () => {
    const { theme, switchTheme } = useTheme();
    const { user } = useAuth();

    const FinancialSettings = () => {
        const [settings, setSettings] = React.useState({
            useTax: false,
            taxRate: 0,
            useServiceCharge: false,
            serviceChargeRate: 0,
            restaurantName: user?.clientName || ''
        });
        const [loading, setLoading] = React.useState(true);
        const [saving, setSaving] = React.useState(false);

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
                    // Extract client settings from user data (backend sends client object usually)
                    const client = data.user.client;
                    if (client) {
                        setSettings({
                            useTax: client.useTax || false,
                            taxRate: client.taxRate || 0,
                            useServiceCharge: client.useServiceCharge || false,
                            serviceChargeRate: client.serviceChargeRate || 0,
                            restaurantName: client.name || user?.clientName || ''
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

        if (loading) return <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" size={16} /> Loading settings...</div>;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* VAT Section */}
                    <div className="input-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                <Receipt size={16} color="var(--primary)" />
                                Value Added Tax (VAT)
                            </label>
                            <input
                                type="checkbox"
                                checked={settings.useTax}
                                onChange={e => setSettings({ ...settings, useTax: e.target.checked })}
                                style={{ width: '18px', height: '18px' }}
                            />
                        </div>
                        <div style={{ opacity: settings.useTax ? 1 : 0.4, pointerEvents: settings.useTax ? 'auto' : 'none' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Percentage to apply on subtotal</p>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={settings.taxRate}
                                    onChange={e => setSettings({ ...settings, taxRate: e.target.value })}
                                />
                                <Percent size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                    </div>

                    {/* Service Charge Section */}
                    <div className="input-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                <Percent size={16} color="var(--accent)" />
                                Service Charge
                            </label>
                            <input
                                type="checkbox"
                                checked={settings.useServiceCharge}
                                onChange={e => setSettings({ ...settings, useServiceCharge: e.target.checked })}
                                style={{ width: '18px', height: '18px' }}
                            />
                        </div>
                        <div style={{ opacity: settings.useServiceCharge ? 1 : 0.4, pointerEvents: settings.useServiceCharge ? 'auto' : 'none' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Percentage for staff service</p>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={settings.serviceChargeRate}
                                    onChange={e => setSettings({ ...settings, serviceChargeRate: e.target.value })}
                                />
                                <Percent size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ padding: '0.6rem 1.5rem', gap: '8px' }}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Financial Policy
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container animate-fade">
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Settings</h1>
                <p style={{ color: 'var(--text-muted)' }}>Customize your workspace preferences</p>
            </div>

            <div className="settings-page">
                {/* Appearance */}
                <div className="settings-section">
                    <h3><Palette size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Appearance</h3>
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
                                            background: `linear-gradient(135deg, ${info.preview[0]} 60%, ${info.preview[1]} 100%)`,
                                            border: '1px solid var(--border)'
                                        }}
                                    />
                                    <div className="theme-name">{info.name}</div>
                                    <div className="theme-desc">{info.desc}</div>
                                    {isActive && (
                                        <div style={{
                                            marginTop: '0.5rem',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: 'var(--primary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Active
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Account Info */}
                <div className="settings-section">
                    <h3><User size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Account</h3>
                    <div className="premium-glass" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                            <div className="input-group">
                                <label>Name</label>
                                <input className="form-input" value={user?.name || ''} readOnly />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input className="form-input" value={user?.email || ''} readOnly />
                            </div>
                            <div className="input-group">
                                <label>Role</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Shield size={14} color="var(--primary)" />
                                    <span className="badge badge-primary">{user?.role || 'Staff'}</span>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Restaurant</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building2 size={14} color="var(--text-muted)" />
                                    <span style={{ fontWeight: 600 }}>{user?.clientName || 'N/A'}</span>
                                </div>
                            </div>
                            {user?.role === 'ADMIN' && (
                                <div className="input-group">
                                    <label>Shop Code (for Staff PIN Logic)</label>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.5rem 1rem',
                                        background: 'var(--primary-glow)',
                                        border: '1px dashed var(--primary)',
                                        borderRadius: '8px',
                                        marginTop: '0.25rem'
                                    }}>
                                        <Hash size={16} color="var(--primary)" />
                                        <span style={{
                                            fontSize: '1.2rem',
                                            fontWeight: 800,
                                            color: 'var(--primary)',
                                            letterSpacing: '0.1em',
                                            fontFamily: 'monospace'
                                        }}>
                                            {user?.shopCode || '------'}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        Share this code with your staff so they can log in via PIN.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Financial Settings (For Admins) */}
                {user?.role === 'ADMIN' && (
                    <div className="settings-section">
                        <h3>Financial Configuration</h3>
                        <div className="premium-glass" style={{ padding: '1.5rem' }}>
                            <FinancialSettings />
                        </div>
                    </div>
                )}

                {/* About */}
                <div className="settings-section">
                    <h3>About</h3>
                    <div className="premium-glass" style={{ padding: '1.5rem' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            <strong style={{ color: 'var(--text-main)' }}>RestroFlow</strong> — Multi-Tenant Restaurant Management System<br />
                            Version 2.0 · Artisan Design System<br />
                            © 2024 RestroFlow
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
