import React, { useState } from 'react';
import { Lock, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config';

const ClientPasswordResetModal = ({ isOpen, onClose, selectedClient }) => {
    const [submitLoading, setSubmitLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const handleResetClientPassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/clients/${selectedClient.id}/reset-password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword: passwordData.newPassword })
            });

            if (response.ok) {
                toast.success('Password reset successfully');
                onClose();
                setPasswordData({ newPassword: '', confirmPassword: '' });
            } else {
                const data = await response.json();
                toast.error(data.error || 'Reset failed');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay animate-fade">
            <div className="modal-content animate-slideUp" style={{ maxWidth: '400px' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Security Reset</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Updating admin password for <strong>{selectedClient?.name}</strong>.</p>
                </div>
                <form onSubmit={handleResetClientPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="input-group">
                        <label>New Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} />
                            <input type="password" value={passwordData.newPassword || ''}
                                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} required />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Confirm Password</label>
                        <div className="input-wrapper">
                            <CheckCircle2 size={18} />
                            <input type="password" value={passwordData.confirmPassword || ''}
                                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} required />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 2 }}>
                            {submitLoading ? <Loader2 className="animate-spin" /> : 'Reset Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientPasswordResetModal;
