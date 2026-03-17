import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import {
    Store,
    User,
    Mail,
    Phone,
    MapPin,
    MessageSquare,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Zap,
    ShieldCheck,
    BarChart3,
    ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Signup = () => {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        restaurantName: '',
        ownerName: '',
        email: '',
        phone: '',
        location: '',
        message: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSubmitted(true);
                toast.success('Interest submitted! We will contact you soon.');
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to submit request');
            }
        } catch (err) {
            toast.error('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="login-container" style={{ padding: '2rem' }}>
                <div className="premium-glass animate-fade" style={{ maxWidth: '600px', width: '100%', padding: '4rem', textAlign: 'center', margin: 'auto' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
                        borderRadius: '50%',
                        marginBottom: '2rem',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)'
                    }}>
                        <CheckCircle2 size={64} />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Welcome Aboard!</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', lineHeight: 1.8, fontSize: '1.1rem' }}>
                        Your interest in <strong>RestroBaba</strong> has been successfully registered. Our gourmet success team will personally reach out to you within 24 hours to begin your journey toward restaurant excellence.
                    </p>
                    <Link to="/login" className="nav-item active" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        textDecoration: 'none',
                        padding: '1rem 3rem',
                        fontSize: '1.1rem',
                        borderRadius: '12px',
                        fontWeight: 700
                    }}>
                        Return to Login <ArrowRight size={20} />
                    </Link>
                </div>
            </div>
        );
    }

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
                        The Future of <br />
                        <span style={{ color: 'var(--primary)' }}>Fine Dining</span> POS.
                    </h1>

                    <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '4rem' }}>
                        Join thousands of modern restaurateurs who are simplifying their operations, boosting sales, and delighting guests with the world's most elegant management suite.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ color: 'var(--primary)', paddingTop: '0.2rem' }}><Zap size={24} /></div>
                            <div>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', fontWeight: 800 }}>Lightning Fast</h4>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Zero-lag order processing even on low-cost devices.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ color: 'var(--primary)', paddingTop: '0.2rem' }}><ShieldCheck size={24} /></div>
                            <div>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', fontWeight: 800 }}>Highly Secure</h4>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Financial data encrypted with military-grade standards.</p>
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
                <Link to="/login" className="back-to-login" style={{ position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, zIndex: 10 }}>
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <div className="premium-glass animate-fade" style={{
                    maxWidth: '540px',
                    width: '100%',
                    padding: '3rem',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Let's Grow.</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Fill in your details to start your 30-day free trial.</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>
                                <Store size={12} style={{ marginRight: '0.4rem' }} /> Restaurant Details
                            </label>
                            <input
                                type="text"
                                name="restaurantName"
                                placeholder="Business Name"
                                className="form-input"
                                style={{ padding: '1rem', fontSize: '1rem', background: 'var(--bg-input)', border: '2px solid var(--border)', borderRadius: '12px', width: '100%', color: 'var(--text-main)', outline: 'none', transition: 'all 0.3s' }}
                                required
                                value={formData.restaurantName}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="signup-grid-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>
                                    <User size={12} style={{ marginRight: '0.4rem' }} /> Owner
                                </label>
                                <input
                                    type="text"
                                    name="ownerName"
                                    placeholder="Full Name"
                                    className="form-input"
                                    style={{ padding: '1rem', fontSize: '1rem', background: 'var(--bg-input)', border: '2px solid var(--border)', borderRadius: '12px', width: '100%', color: 'var(--text-main)', outline: 'none' }}
                                    required
                                    value={formData.ownerName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>
                                    <Phone size={12} style={{ marginRight: '0.4rem' }} /> Contact
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="+977"
                                    className="form-input"
                                    style={{ padding: '1rem', fontSize: '1rem', background: 'var(--bg-input)', border: '2px solid var(--border)', borderRadius: '12px', width: '100%', color: 'var(--text-main)', outline: 'none' }}
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>
                                <Mail size={12} style={{ marginRight: '0.4rem' }} /> Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                placeholder="name@restaurant.com"
                                className="form-input"
                                style={{ padding: '1rem', fontSize: '1rem', background: 'var(--bg-input)', border: '2px solid var(--border)', borderRadius: '12px', width: '100%', color: 'var(--text-main)', outline: 'none' }}
                                required
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>
                                <MapPin size={12} style={{ marginRight: '0.4rem' }} /> City / Location
                            </label>
                            <input
                                type="text"
                                name="location"
                                placeholder="e.g. Kathmandu, Nepal"
                                className="form-input"
                                style={{ padding: '1rem', fontSize: '1rem', background: 'var(--bg-input)', border: '2px solid var(--border)', borderRadius: '12px', width: '100%', color: 'var(--text-main)', outline: 'none' }}
                                value={formData.location}
                                onChange={handleChange}
                            />
                        </div>

                        <button
                            type="submit"
                            className="nav-item active"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1.25rem',
                                fontSize: '1.1rem',
                                marginTop: '1.5rem',
                                borderRadius: '14px',
                                boxShadow: '0 10px 20px rgba(212, 175, 55, 0.2)',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem'
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : <>Continue to Registration <ArrowRight size={20} /></>}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        By proceeding, you agree to our <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Terms of Service</span> and <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Privacy Policy</span>.
                    </p>
                </div>
            </div>

            {/* CSS for custom Layout and Mobile responsiveness */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 1200px) {
                    .signup-hero-side h1 { font-size: 3.5rem !important; }
                }
                @media (max-width: 1024px) {
                    .signup-hero-side { display: none !important; }
                    .signup-form-side { flex: 1 !important; width: 100vw !important; padding: 1.5rem !important; justify-content: flex-start !important; }
                    .signup-form-side .premium-glass { padding: 2rem !important; margin-top: 1rem; }
                    .signup-form-side h2 { font-size: 2rem !important; }
                    .back-to-login { position: relative !important; top: 0 !important; left: 0 !important; margin-bottom: 1rem; align-self: flex-start; }
                }
                @media (max-width: 640px) {
                    .signup-grid-mobile { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
                    .signup-form-side .premium-glass { padding: 1.5rem !important; }
                }
                .form-input:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 15px rgba(212, 175, 55, 0.15) !important;
                    background: var(--bg-card) !important;
                }
                .signup-form-side::-webkit-scrollbar { width: 0; background: transparent; }
            ` }} />
        </div>
    );
};

export default Signup;
