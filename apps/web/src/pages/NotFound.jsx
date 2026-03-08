import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle, ArrowLeft } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="page-container" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '80vh',
            textAlign: 'center'
        }}>
            <div className="premium-glass" style={{
                padding: '4rem',
                borderRadius: '24px',
                maxWidth: '500px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'var(--danger)20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                }}>
                    <AlertCircle size={40} color="var(--danger)" />
                </div>

                <h1 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--text-heading)', margin: 0, lineHeight: 1 }}>404</h1>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Page Not Found</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Oops! The page you're looking for doesn't exist or has been moved.
                </p>

                <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                    <button
                        onClick={() => navigate(-1)}
                        className="nav-item"
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            background: 'var(--glass-shine)',
                            border: '1px solid var(--glass-border)',
                            padding: '0.8rem',
                            borderRadius: '12px'
                        }}
                    >
                        <ArrowLeft size={18} />
                        <span>Go Back</span>
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="nav-item active"
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            padding: '0.8rem',
                            borderRadius: '12px',
                            background: 'var(--primary)',
                            color: 'white'
                        }}
                    >
                        <Home size={18} />
                        <span>Home</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
