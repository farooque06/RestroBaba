import React, { useState } from 'react';
import { ShieldCheck, XCircle, Lock, Key, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config';

const MySecurityModal = ({ isOpen, onClose }) => {
    const [submitLoading, setSubmitLoading] = useState(false);
    const [myPasswordData, setMyPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChangeMyPassword = async (e) => {
        e.preventDefault();
        if (myPasswordData.newPassword !== myPasswordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: myPasswordData.currentPassword,
                    newPassword: myPasswordData.newPassword
                })
            });

            if (response.ok) {
                toast.success('Your password has been updated securely');
                onClose();
                setMyPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await response.json();
                toast.error(data.error || 'Update failed');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <div className="modal-card animate-fade-in" style={{ width: '420px', padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ShieldCheck color="var(--primary)" size={24} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Security</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <XCircle size={24} />
                    </button>
                </div>

                <form onSubmit={handleChangeMyPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Current Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} />
                            <input
                                type="password"
                                className="auth-input"
                                required
                                value={myPasswordData.currentPassword || ''}
                                onChange={e => setMyPasswordData({ ...myPasswordData, currentPassword: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>New Password</label>
                        <div className="input-wrapper">
                            <Key size={18} />
                            <input
                                type="password"
                                className="auth-input"
                                required
                                minLength={6}
                                value={myPasswordData.newPassword || ''}
                                onChange={e => setMyPasswordData({ ...myPasswordData, newPassword: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Confirm New Password</label>
                        <div className="input-wrapper">
                            <Key size={18} />
                            <input
                                type="password"
                                className="auth-input"
                                required
                                minLength={6}
                                value={myPasswordData.confirmPassword || ''}
                                onChange={e => setMyPasswordData({ ...myPasswordData, confirmPassword: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={submitLoading} className="btn-primary" style={{ flex: 1 }}>
                            {submitLoading ? <Loader2 className="animate-spin" /> : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MySecurityModal;
