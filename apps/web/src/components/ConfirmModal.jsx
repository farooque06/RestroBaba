import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
    if (!isOpen) return null;

    const variantColors = {
        danger: {
            icon: 'var(--danger)',
            bg: 'rgba(239, 68, 68, 0.1)',
            border: 'rgba(239, 68, 68, 0.2)',
            button: 'var(--danger)'
        },
        warning: {
            icon: 'var(--warning)',
            bg: 'rgba(245, 158, 11, 0.1)',
            border: 'rgba(245, 158, 11, 0.2)',
            button: 'var(--warning)'
        },
        primary: {
            icon: 'var(--primary)',
            bg: 'rgba(99, 102, 241, 0.1)',
            border: 'rgba(99, 102, 241, 0.2)',
            button: 'var(--primary)'
        }
    };

    const colors = variantColors[variant] || variantColors.danger;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3000,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="modal-card animate-fade-in" style={{
                width: '400px',
                padding: '2rem',
                textAlign: 'center',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: colors.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem'
                }}>
                    <AlertCircle size={32} color={colors.icon} />
                </div>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: 700 }}>{title}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>{message}</p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '0.8rem',
                            borderRadius: '12px',
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{
                            flex: 1,
                            padding: '0.8rem',
                            borderRadius: '12px',
                            background: colors.button,
                            border: 'none',
                            color: 'white',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: `0 4px 12px ${colors.bg}`
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
