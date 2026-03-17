import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    LogIn, Mail, Lock, Loader2, Store, UserCircle,
    ChevronLeft, KeyRound, Shield, Smartphone, QrCode,
    Zap, ShieldCheck, ArrowRight, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
            setShopCode('');
        }
        setLoading(false);
    };

    // Auto-resolve shop code when 6 chars are entered
    useEffect(() => {
        if (shopCode.length === 6 && step === 1 && mode === 'pin') {
            handleShopResolve();
        }
    }, [shopCode]);

    const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const getRoleColor = (role) => {
        if (role === 'CHEF') return 'var(--warning)';
        if (role === 'WAITER') return 'var(--accent)';
        return 'var(--primary)';
    };

    return (
        <div className="login-container" style={{ 
            height: '100vh', 
            overflow: 'hidden', 
            padding: 0,
            display: 'flex',
            alignItems: 'stretch'
        }}>
            {/* Left Hero Section (Desktop Only) */}
            <div className="signup-hero-side" style={{ 
                flex: '1.2', 
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                padding: '4rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                color: 'white'
            }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)', opacity: 0.1, filter: 'blur(60px)' }}></div>
                <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', opacity: 0.1, filter: 'blur(60px)' }}></div>
                
                <div className="animate-slide-up" style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <img src="/pwa-192x192.png" alt="RestroBaba" style={{ width: '48px', height: '48px' }} />
                        <span style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '2px' }}>RESTROBABA</span>
                    </div>
                    
                    <h1 style={{ fontSize: '4.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '2rem', letterSpacing: '-0.03em' }}>
                        Elevate Your <br/> 
                        <span style={{ color: 'var(--primary)' }}>Guest Experience.</span>
                    </h1>
                    
                    <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '4rem' }}>
                        Access your restaurant's dashboard and manage your operations with precision, speed, and elegance.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ color: 'var(--primary)', paddingTop: '0.2rem' }}><Zap size={24} /></div>
                            <div>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', fontWeight: 800 }}>Seamless Sync</h4>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Real-time updates across all waitstaff and kitchen screens.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ color: 'var(--primary)', paddingTop: '0.2rem' }}><ShieldCheck size={24} /></div>
                            <div>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', fontWeight: 800 }}>Secure Login</h4>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Advanced multi-tenant isolation and 2FA protection.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Form Section */}
            <div className="signup-form-side" style={{ 
                flex: '1', 
                background: 'var(--bg-main)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem',
                overflowY: 'auto',
                position: 'relative'
            }}>
                <div className={`premium-glass animate-fade ${shake ? 'login-shake' : ''}`} style={{ 
                    maxWidth: '500px', 
                    width: '100%', 
                    padding: '3rem',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Welcome Back</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            {mode === 'email' ? 'System Administrator Access' :
                             totpStep ? 'Security Verification' :
                             step === 1 ? 'Enter your shop code to begin' :
                             step === 2 ? `Staff Selection for ${clientName}` : 
                             `Welcome, ${selectedUser?.name}`}
                        </p>
                    </div>

                    {/* TOTP Flow */}
                    {totpStep === 'setup' && (
                        <div className="animate-fade">
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px', marginBottom: '1rem', color: 'var(--primary)' }}>
                                    <QrCode size={32} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Setup 2FA</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>Scan this code with your Authenticator app.</p>
                            </div>
                            {qrCode && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '12px' }}>
                                    <img src={qrCode} alt="TOTP QR" style={{ width: '180px', height: '180px' }} />
                                </div>
                            )}
                            <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1.5rem' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Secret Key</p>
                                <code style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em' }}>{manualSecret}</code>
                            </div>
                            <button className="nav-item active" style={{ width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: 800 }} onClick={() => setTotpStep('verify')}>
                                I've Scanned <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                            </button>
                        </div>
                    )}

                    {totpStep === 'verify' && (
                        <div className="animate-fade">
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px', marginBottom: '1rem', color: 'var(--primary)' }}>
                                    <Smartphone size={32} />
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter the 6-digit verification code</p>
                            </div>
                            <AuthInput value={totp} onChange={setTotp} length={6} isAlphanumeric={false} />
                            {error && <p className="error-message" style={{ textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
                            <button className="nav-item active" style={{ width: '100%', padding: '1rem', marginTop: '2rem', borderRadius: '12px', fontWeight: 800 }} 
                                    onClick={() => handleVerifyTotp(totp)} disabled={loading || totp.length !== 6}>
                                {loading ? <Loader2 className="animate-spin" /> : 'Verify & Continue'}
                            </button>
                            <button className="login-switch-link" style={{ width: '100%', marginTop: '1rem' }} onClick={() => { setTotpStep(null); setTotp(''); setError(''); }}>Cancel</button>
                        </div>
                    )}

                    {/* Standard Login Flow */}
                    {!totpStep && (
                        <>
                            {mode === 'email' ? (
                                <form onSubmit={handleEmailLogin} className="animate-fade" style={{ display: 'grid', gap: '1.5rem' }}>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required 
                                                   style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--bg-input)', border: '2px solid var(--border)', borderRadius: '12px', outline: 'none', color: 'var(--text-main)', transition: 'all 0.3s' }} />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required 
                                                   style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--bg-input)', border: '2px solid var(--border)', borderRadius: '12px', outline: 'none', color: 'var(--text-main)' }} />
                                        </div>
                                    </div>
                                    {error && <p className="error-message">{error}</p>}
                                    <button type="submit" className="nav-item active" style={{ width: '100%', padding: '1.25rem', borderRadius: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                        {loading ? <Loader2 className="animate-spin" /> : <><LogIn size={20} /> Administrator Sign In</>}
                                    </button>
                                    <button type="button" className="login-switch-link" style={{ marginTop: '0.5rem' }} onClick={() => { setMode('pin'); setError(''); }}>
                                        <KeyRound size={16} /> Switch to Staff PIN Login
                                    </button>
                                </form>
                            ) : (
                                <div className="animate-fade">
                                    {step === 1 && (
                                        <div className="animate-fade">
                                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                                <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px', marginBottom: '1rem', color: 'var(--primary)' }}>
                                                    <Store size={32} />
                                                </div>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter the 6-character shop code</p>
                                            </div>
                                            <AuthInput value={shopCode} onChange={setShopCode} length={6} isAlphanumeric={true} />
                                            {error && <p className="error-message" style={{ textAlign: 'center', marginTop: '1.5rem' }}>{error}</p>}
                                            <button type="button" className="login-switch-link" style={{ width: '100%', marginTop: '2rem' }} onClick={() => { setMode('email'); setError(''); }}>
                                                <Mail size={16} /> Admin Login
                                            </button>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="animate-fade">
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                                {staffList.map(s => (
                                                    <button key={s.id} className="login-staff-card" onClick={() => { setSelectedUser(s); setPin(''); goToStep(3); }}
                                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', transition: 'all 0.3s' }}>
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: getRoleColor(s.role), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.2rem' }}>
                                                            {getInitials(s.name)}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', textAlign: 'center' }}>{s.name}</span>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{s.role}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <button className="login-back-link" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }} onClick={() => goToStep(1, 'backward')}>
                                                <ArrowLeft size={16} /> Change Restaurant
                                            </button>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="animate-fade">
                                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: getRoleColor(selectedUser.role), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.5rem', margin: '0 auto 1rem' }}>
                                                    {getInitials(selectedUser.name)}
                                                </div>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter your 4-digit security PIN</p>
                                            </div>
                                            <AuthInput value={pin} onChange={setPin} length={4} isAlphanumeric={false} />
                                            {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', color: 'var(--primary)' }}><Loader2 className="animate-spin" size={20} /> <span style={{ fontWeight: 600 }}>Verifying...</span></div>}
                                            {error && <p className="error-message" style={{ textAlign: 'center', marginTop: '1.5rem' }}>{error}</p>}
                                            <button className="login-back-link" style={{ width: '100%', marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }} onClick={() => { goToStep(2, 'backward'); setPin(''); }}>
                                                <ArrowLeft size={16} /> Select Different Staff
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Want to use RestroBaba in your restaurant?</p>
                        <Link to="/signup" className="nav-item" style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            color: 'var(--primary)', 
                            fontWeight: 800, 
                            textDecoration: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            background: 'rgba(212, 175, 55, 0.05)'
                        }}>
                             Grow with us now <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media (max-width: 1024px) {
                    .signup-hero-side { display: none !important; }
                    .signup-form-side { flex: 1 !important; width: 100vw !important; padding: 1.5rem !important; }
                    .signup-form-side .premium-glass { padding: 2rem !important; }
                }
                .login-staff-card:hover {
                    border-color: var(--primary) !important;
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                    cursor: pointer;
                }
                .error-message {
                    color: #ef4444;
                    font-size: 0.85rem;
                    font-weight: 600;
                    background: rgba(239, 68, 68, 0.1);
                    padding: 0.75rem;
                    border-radius: 8px;
                    margin: 1rem 0;
                }
            ` }} />
        </div>
    );
};

export default Login;
