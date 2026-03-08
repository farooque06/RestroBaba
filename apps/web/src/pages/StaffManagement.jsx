import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
    Users, Plus, Trash2, Edit2, Shield,
    ChefHat, Coffee, Loader2, X,
    UserCheck, UserX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import AuthInput from '../components/AuthInput';

const roleConfig = {
    ADMIN: { label: 'Admin', color: '#818cf8', icon: Shield },
    WAITER: { label: 'Waiter', color: '#10b981', icon: Coffee },
    CHEF: { label: 'Chef', color: '#f59e0b', icon: ChefHat },
};

const StaffManagement = () => {
    const { user } = useAuth();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'WAITER', pin: ''
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });

    useEffect(() => { fetchStaff(); }, []);

    const fetchStaff = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/staff`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setStaff(data);
        } catch (err) {
            console.error('Failed to fetch staff', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingStaff(null);
        setFormData({ name: '', email: '', password: '', role: 'WAITER', pin: '' });
        setError('');
        setIsModalOpen(true);
    };

    const openEditModal = (member) => {
        setEditingStaff(member);
        setFormData({
            name: member.name,
            email: member.email,
            password: '',
            role: member.role,
            pin: member.pin || ''
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        const token = localStorage.getItem('restroToken');

        try {
            const url = editingStaff
                ? `${API_BASE_URL}/api/staff/${editingStaff.id}`
                : `${API_BASE_URL}/api/staff`;

            const body = editingStaff
                ? { name: formData.name, email: formData.email, role: formData.role, pin: formData.pin || null }
                : formData;

            const res = await fetch(url, {
                method: editingStaff ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (res.ok) {
                setIsModalOpen(false);
                fetchStaff();
                toast.success(editingStaff ? 'Staff updated' : 'Staff created');
            } else {
                toast.error(data.error || 'Operation failed');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleActive = async (member) => {
        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/staff/${member.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !member.isActive })
            });
            if (res.ok) {
                fetchStaff();
                toast.success(`Staff ${!member.isActive ? 'activated' : 'deactivated'}`);
            } else {
                toast.error('Status update failed');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    const deleteStaff = (id) => {
        setConfirmAction({
            title: 'Delete Staff Member?',
            message: 'Are you sure you want to permanently delete this staff member? This will remove their access to the system.',
            onConfirm: () => performDeleteStaff(id)
        });
        setIsConfirmModalOpen(true);
    };

    const performDeleteStaff = async (id) => {
        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchStaff();
                toast.success('Staff member deleted');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Staff Management</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Manage your team at <strong style={{ color: 'var(--text-main)' }}>{user?.clientName}</strong>
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="nav-item active"
                    style={{ border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
                >
                    <Plus size={20} />
                    <span>Add Staff</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '3rem', gap: '1.5rem' }}>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)', color: 'white', border: 'none' }}>
                    <span className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Team Size</span>
                    <span className="stat-value">{staff.length}</span>
                </div>
                {Object.entries(roleConfig).map(([role, config]) => (
                    <div key={role} className="stat-card" style={{ borderLeft: `4px solid ${config.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                            <config.icon size={16} color={config.color} />
                            <span className="stat-label">{config.label}s</span>
                        </div>
                        <span className="stat-value" style={{ color: config.color }}>{staff.filter(s => s.role === role).length}</span>
                    </div>
                ))}
            </div>

            {/* Staff Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                {staff.map(member => {
                    const config = roleConfig[member.role] || roleConfig.WAITER;
                    const RoleIcon = config.icon;
                    const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                        <div key={member.id} className="stat-card" style={{
                            padding: '1.5rem',
                            border: '1px solid var(--glass-border)',
                            background: member.isActive ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
                            opacity: member.isActive ? 1 : 0.7,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '18px',
                                        background: `linear-gradient(135deg, ${config.color}20, ${config.color}40)`,
                                        border: `1px solid ${config.color}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.25rem', fontWeight: 900, color: config.color,
                                        boxShadow: `0 8px 16px -4px ${config.color}20`
                                    }}>
                                        {initials}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>{member.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <RoleIcon size={12} color={config.color} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: config.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: member.isActive ? '#10b981' : 'var(--danger)',
                                    boxShadow: `0 0 12px ${member.isActive ? '#10b981' : 'var(--danger)'}40`
                                }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <Shield size={14} opacity={0.6} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <Shield size={14} style={{ opacity: member.pin ? 1 : 0.2 }} color={member.pin ? 'var(--primary)' : 'inherit'} />
                                    <span>{member.pin ? 'Quick PIN Enabled' : 'No PIN Set'}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                                <button onClick={() => openEditModal(member)}
                                    className="premium-glass"
                                    style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid var(--glass-border)' }}>
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button onClick={() => toggleActive(member)}
                                    className="premium-glass"
                                    title={member.isActive ? 'Suspend Access' : 'Restore Access'}
                                    style={{ padding: '0.65rem', borderRadius: '10px', cursor: 'pointer', color: member.isActive ? 'var(--danger)' : '#10b981', border: '1px solid var(--glass-border)' }}>
                                    {member.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                                </button>
                                {member.id !== user?.id && (
                                    <button onClick={() => deleteStaff(member.id)}
                                        style={{ padding: '0.65rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', cursor: 'pointer' }}>
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {staff.length === 0 && (
                <div className="premium-glass" style={{ padding: '4rem', textAlign: 'center' }}>
                    <Users size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No staff members yet. Click "Add Staff" to get started.</p>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>{editingStaff ? 'Edit Staff' : 'Add New Staff'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input className="auth-input" placeholder="Full Name" required value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })} />

                            <input className="auth-input" type="email" placeholder="Email Address" required value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })} />

                            {!editingStaff && (
                                <input className="auth-input" type="password" placeholder="Password" required value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            )}

                            <select className="auth-input" value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                style={{ background: 'var(--card-glass)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '0.75rem', borderRadius: '10px' }}>
                                <option value="WAITER">Waiter</option>
                                <option value="CHEF">Chef</option>
                                <option value="ADMIN">Admin</option>
                            </select>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        SECURITY PIN
                                    </label>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>4 Digits Required</span>
                                </div>
                                <AuthInput
                                    value={formData.pin}
                                    onChange={val => setFormData({ ...formData, pin: val })}
                                    length={4}
                                    isAlphanumeric={false}
                                />
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', lineHeight: '1.4' }}>
                                    Staff can use this PIN to quickly switch accounts or authorize sales without their full password.
                                </p>
                            </div>

                            {error && <div className="error-message">{error}</div>}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="nav-item active"
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : (editingStaff ? 'Save Changes' : 'Create Staff')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmAction.onConfirm}
                title={confirmAction.title}
                message={confirmAction.message}
                variant="danger"
            />
        </div>
    );
};

export default StaffManagement;
