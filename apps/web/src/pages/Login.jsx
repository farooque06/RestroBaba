import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    LogIn, Mail, Lock, Loader2, Store, UserCircle,
    ChevronLeft, KeyRound, Shield, Smartphone, QrCode
} from 'lucide-react';
import AuthInput from '../components/AuthInput';

const Login = () => {
    const [mode, setMode] = useState('pin'); // 'pin' or 'email'
    const [step, setStep] = useState(1); // 1: Shop Code, 2: Staff Select, 3: PIN Entry
    const [direction, setDirection] = useState('forward');

    // TOTP States
    const [totpStep, setTotpStep] = useState(null); // null | 'setup' | 'verify'
    const [qrCode, setQrCode] = useState(null);
    const [manualSecret, setManualSecret] = useState('');
    const [tempUserId, setTempUserId] = useState(null);

    // Auth States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [totp, setTotp] = useState('');
    const [shopCode, setShopCode] = useState('');

    // Data States
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [clientName, setClientName] = useState('');
    const [staffList, setStaffList] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [shake, setShake] = useState(false);



    const { login, verifyTotp, resolveShop, loginWithPin } = useAuth();

    // Effects


    useEffect(() => {
        if (pin.length === 4 && selectedUser && !loading) {
            const timer = setTimeout(() => handlePinSubmit(null, pin), 200);
            return () => clearTimeout(timer);
        }
    }, [pin]);

    useEffect(() => {
        if (totp.length === 6 && tempUserId && !loading) {
            const timer = setTimeout(() => handleVerifyTotp(totp), 200);
            return () => clearTimeout(timer);
        }
    }, [totp]);

    useEffect(() => {
        if (shake) { const t = setTimeout(() => setShake(false), 600); return () => clearTimeout(t); }
    }, [shake]);

    const goToStep = (n, dir = 'forward') => { setDirection(dir); setStep(n); setError(''); };


    // Auth Handlers
    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        const result = await login(email, password);
        if (result.success) {
            if (result.requiresTOTP) {
                setTempUserId(result.userId);
                if (result.needsSetup) {
                    setQrCode(result.qrCode);
                    setManualSecret(result.secret);
                    setTotpStep('setup');
                } else {
                    setTotpStep('verify');
                }
            }
            // If no TOTP needed, AuthContext handled the login
        } else {
            setError(result.error); setShake(true);
        }
        setLoading(false);
    };

    const handleVerifyTotp = async (code) => {
        setLoading(true); setError('');
        const result = await verifyTotp(tempUserId, code);
        if (!result.success) {
            setError(result.error);
            setTotp('');
            setShake(true);
        }
        setLoading(false);
    };

    const handlePinSubmit = async (e, pinStr) => {
        if (e) e.preventDefault();
        const fullPin = pinStr || pin;
        if (fullPin.length !== 4) return;
        setLoading(true);
        const result = await loginWithPin(selectedUser.id, fullPin);
        if (!result.success) {
            setError(result.error); setPin(''); setShake(true);
        }
        setLoading(false);
    };

    const handleShopResolve = async (e) => {
        if (e) e.preventDefault();
        if (shopCode.length !== 6) return;
        setLoading(true);
        const result = await resolveShop(shopCode);
        if (result.success) {
            setClientName(result.data.clientName);
            setStaffList(result.data.staff);
            goToStep(2);
        } else {
            setError(result.error);
            setShake(true);
            setShopCode(''); // Clear on error to retry
        }
        setLoading(false);
    };

    // Auto-resolve shop code when 6 chars are entered
    useEffect(() => {
        if (shopCode.length === 6 && step === 1 && mode === 'pin') {
            handleShopResolve();
        }
    }, [shopCode]);

    // Helpers
    const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const getRoleColor = (role) => {
        if (role === 'CHEF') return 'var(--warning)';
        if (role === 'WAITER') return 'var(--accent)';
        return 'var(--primary)';
    };

    // ─── TOTP SETUP SCREEN ──────────────────────────────────────
    if (totpStep === 'setup') {
        return (
            <div className="login-container">
                <div className="login-orb login-orb-1"></div>
                <div className="login-orb login-orb-2"></div>
                <div className={`login-glass-card ${shake ? 'login-shake' : ''}`} style={{ maxWidth: '460px' }}>
                    <div className="login-header">
                        <div className="logo-section">
                            <div className="logo-icon"><Shield size={24} /></div>
                            <h1>RestroBaBa</h1>
                        </div>
                        <p className="login-subtitle">Two-Factor Authentication Setup</p>
                    </div>

                    <div className="login-form">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div className="status-badge" style={{ margin: '0 auto 1rem' }}>
                                <QrCode size={14} /> FIRST TIME SETUP
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>
                            </p>
                        </div>

                        {qrCode && (
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    padding: '1rem', background: 'white', borderRadius: '12px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                }}>
                                    <img src={qrCode || null} alt="TOTP QR Code" style={{ width: '200px', height: '200px' }} />
                                </div>
                            </div>
                        )}

                        <div style={{
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            padding: '0.75rem 1rem', borderRadius: '8px', textAlign: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Manual Entry Key</p>
                            <code style={{
                                fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.15em',
                                color: 'var(--text-heading)', wordBreak: 'break-all'
                            }}>{manualSecret}</code>
                        </div>

                        <button className="login-button" onClick={() => setTotpStep('verify')}>
                            I've Scanned — Enter Code
                        </button>
                    </div>

                    <div className="login-footer">
                        <p>© 2024 RestroBaBa · Secure Access</p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── TOTP VERIFY SCREEN ─────────────────────────────────────
    if (totpStep === 'verify') {
        return (
            <div className="login-container">
                <div className="login-orb login-orb-1"></div>
                <div className="login-orb login-orb-2"></div>
                <div className={`login-glass-card ${shake ? 'login-shake' : ''}`}>
                    <div className="login-header">
                        <div className="logo-section">
                            <div className="logo-icon"><Shield size={24} /></div>
                            <h1>RestroBaBa</h1>
                        </div>
                        <p className="login-subtitle">Two-Factor Authentication</p>
                    </div>

                    <div className="login-form">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div className="status-badge" style={{ margin: '0 auto 1rem' }}>
                                <Smartphone size={14} /> AUTHENTICATOR CODE
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Enter the 6-digit code from your authenticator app
                            </p>
                        </div>

                        <AuthInput
                            value={totp}
                            onChange={setTotp}
                            length={6}
                            isAlphanumeric={false}
                        />

                        {error && <div className="error-message" style={{ textAlign: 'center', marginTop: '1rem' }}>{error}</div>}

                        <button className="login-button" style={{ marginTop: '1.5rem' }}
                            onClick={() => handleVerifyTotp(totp)}
                            disabled={loading || totp.length !== 6}>
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify & Sign In'}
                        </button>

                        <button className="login-switch-link" onClick={() => { setTotpStep(null); setTotp(''); setError(''); }}>
                            Cancel
                        </button>
                    </div>

                    <div className="login-footer">
                        <p>© 2024 RestroBaBa · Secure Access</p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── MAIN LOGIN SCREEN ──────────────────────────────────────
    return (
        <div className="login-container">
            <div className="login-orb login-orb-1"></div>
            <div className="login-orb login-orb-2"></div>

            <div className={`login-glass-card ${shake ? 'login-shake' : ''}`}>
                <div className="login-header">
                    <div className="logo-section">
                        <div className="logo-icon"><Shield size={24} /></div>
                        <h1>RestroBaBa</h1>
                    </div>
                    <p className="login-subtitle">
                        {mode === 'email' ? 'System Administrator' :
                            step === 1 ? 'Enter Shop Code' :
                                step === 2 ? clientName : `Welcome, ${selectedUser?.name}`}
                    </p>
                </div>

                {mode === 'email' ? (
                    <form onSubmit={handleEmailLogin} className="login-form">
                        <div className="input-group">
                            <label>Email</label>
                            <div className="input-wrapper">
                                <Mail size={18} />
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <Lock size={18} />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <><LogIn size={18} /> Sign In</>}
                        </button>
                        <button type="button" className="login-switch-link" onClick={() => { setMode('pin'); setError(''); }}>
                            <KeyRound size={14} /> Use PIN Login
                        </button>
                    </form>
                ) : (
                    <div className="login-form">
                        {step === 1 && (
                            <div className="animate-fade">
                                <div className="input-group" style={{ textAlign: 'center' }}>
                                    <label style={{ display: 'block', marginBottom: '1rem' }}>Enter Shop Code</label>
                                    <AuthInput
                                        value={shopCode}
                                        onChange={setShopCode}
                                        length={6}
                                        isAlphanumeric={true}
                                    />
                                    <p className="login-hint">Enter the 6-character code from your restaurant admin.</p>
                                </div>
                                {error && <div className="error-message" style={{ textAlign: 'center' }}>{error}</div>}
                                <div style={{ display: 'none' }}>
                                    {/* Keep form handling for accessibility or hidden submit if needed */}
                                    <button onClick={handleShopResolve} disabled={loading || shopCode.length !== 6}>Submit</button>
                                </div>
                                <button type="button" className="login-switch-link" onClick={() => { setMode('email'); setError(''); }}>
                                    <Mail size={14} /> Admin Login
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-fade">
                                <div className="login-staff-grid">
                                    {staffList.map(s => (
                                        <button key={s.id} className="login-staff-card" onClick={() => { setSelectedUser(s); setPin(''); goToStep(3); }}>
                                            <div className="login-staff-avatar" style={{ background: getRoleColor(s.role) }}>{getInitials(s.name)}</div>
                                            <span className="login-staff-name">{s.name}</span>
                                            <span className="login-staff-role">{s.role}</span>
                                        </button>
                                    ))}
                                </div>
                                {staffList.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        <UserCircle size={40} />
                                        <p>No staff found.</p>
                                    </div>
                                )}
                                <button className="login-back-link" onClick={() => goToStep(1, 'backward')}>
                                    <ChevronLeft size={16} /> Change Shop
                                </button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="animate-fade">
                                <p className="login-pin-label">Enter your 4-digit PIN</p>
                                <AuthInput
                                    value={pin}
                                    onChange={setPin}
                                    length={4}
                                    isAlphanumeric={false}
                                />
                                {loading && <div className="login-pin-loading"><Loader2 className="animate-spin" size={20} /><span>Verifying...</span></div>}
                                {error && <div className="error-message" style={{ textAlign: 'center', marginTop: '1rem' }}>{error}</div>}
                                <button className="login-back-link" onClick={() => { goToStep(2, 'backward'); setPin(''); }}>
                                    <ChevronLeft size={16} /> Back to Staff
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="login-footer">
                    <p>© 2024 RestroBaBa · Multi-Tenant System</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
