import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';
import {
    Users, Plus, Trash2, Edit2, Shield,
    ChefHat, Coffee, Loader2, X,
    UserCheck, UserX, AlertCircle,
    Calendar, Banknote, TrendingDown,
    TrendingUp, FileSpreadsheet, ArrowLeftRight,
    History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Dropdown from '../components/common/Dropdown';
import ConfirmModal from '../components/ConfirmModal';
import AuthInput from '../components/AuthInput';
import { formatCurrency } from '../utils/formatters';

const roleConfig = {
    ADMIN: { label: 'Admin', color: '#818cf8', icon: Shield },
    MANAGER: { label: 'Manager', color: '#f472b6', icon: UserCheck },
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
        name: '', email: '', password: '', role: 'WAITER', pin: '',
        salary: 0, salaryType: 'MONTHLY', joiningDate: new Date().toISOString().split('T')[0]
    });
    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [selectedStaffAccount, setSelectedStaffAccount] = useState(null);
    const [ledgerData, setLedgerData] = useState({ transactions: [], user: null });
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [transactionForm, setTransactionForm] = useState({ type: 'ADVANCE', amount: '', description: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });

    // Plan-based limits (dynamic from DB)
    const plan = user?.client?.plan || 'SILVER';
    const dynamicLimit = user?.client?.subscriptionPlan?.maxStaff;
    
    // Fallback to hardcoded defaults only if DB value is missing
    const fallbackLimits = { SILVER: 2, GOLD: 10, DIAMOND: Infinity };
    const limit = dynamicLimit ?? (fallbackLimits[plan] || 2);
    
    const isLimitReached = staff.length >= limit;

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
            pin: member.pin || '',
            salary: member.salary || 0,
            salaryType: member.salaryType || 'MONTHLY',
            joiningDate: member.joiningDate ? new Date(member.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
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
                ? { 
                    name: formData.name, 
                    email: formData.email, 
                    role: formData.role, 
                    pin: formData.pin || null,
                    salary: formData.salary,
                    salaryType: formData.salaryType,
                    joiningDate: formData.joiningDate
                }
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

    const fetchLedger = async (member) => {
        setLedgerLoading(true);
        setSelectedStaffAccount(member);
        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/staff-accountancy/${member.id}/ledger`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLedgerData(data);
                setShowLedgerModal(true);
            }
        } catch (err) {
            toast.error('Failed to load ledger');
        } finally {
            setLedgerLoading(false);
        }
    };

    const handleTransaction = async (e) => {
        e.preventDefault();
        const amt = parseFloat(transactionForm.amount);
        if (!amt || isNaN(amt)) return toast.error('Valid amount required');
        
        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/staff-accountancy/${selectedStaffAccount.id}/transaction`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(transactionForm)
            });
            if (res.ok) {
                toast.success('Transaction recorded');
                setTransactionForm({ ...transactionForm, amount: '', description: '' });
                fetchLedger(selectedStaffAccount);
            } else {
                toast.error('Failed to record transaction');
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
            <div className="page-header">
                <div className="page-header-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontSize: '2rem', margin: 0 }}>Staff Management</h1>
                        <div className="status-badge active" style={{ fontSize: '0.7rem' }}>
                            <Users size={12} />
                            {staff.length} / {limit === Infinity ? '∞' : limit} Members
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Create and manage staff roles, permissions, and salaries.</p>
                </div>
                {!isLimitReached && (
                    <div className="page-header-actions">
                        <button
                            onClick={openCreateModal}
                            className="btn-primary"
                        >
                            <Plus size={20} />
                            <span>Add Member</span>
                        </button>
                    </div>
                )}
            </div>

            {isLimitReached && (
                <div className="premium-glass" style={{ marginBottom: '2rem', padding: '1rem 1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '1rem', color: '#ef4444' }}>
                    <AlertCircle size={20} />
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                        Staff limit reached for your <strong>{plan}</strong> plan. Upgrade your subscription to add more team members.
                    </p>
                </div>
            )}

            {/* Summary Cards */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '3rem', gap: '1.5rem' }}>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)', color: 'white', border: 'none' }}>
                    <span className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Team Size</span>
                    <span className="stat-value">{staff.length}</span>
                </div>
                {/* Financial Overview Tags */}
                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <span className="stat-label">Total Monthly Salary</span>
                    <span className="stat-value" style={{ color: '#f59e0b' }}>{formatCurrency(staff.reduce((acc, s) => acc + (s.salary || 0), 0))}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                    <span className="stat-label">Total Advances</span>
                    <span className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(staff.reduce((acc, s) => acc + (s.advances || 0), 0))}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <span className="stat-label">Net Balance Due</span>
                    <span className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(staff.reduce((acc, s) => acc + (s.balance || 0), 0))}</span>
                </div>
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
                                    <Banknote size={14} color="var(--success)" opacity={member.salary ? 1 : 0.2} />
                                    <span>{member.salary ? `${formatCurrency(member.salary)} / ${member.salaryType}` : 'Salary Not Set'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <Shield size={14} style={{ opacity: member.pin ? 1 : 0.2 }} color={member.pin ? 'var(--primary)' : 'inherit'} />
                                    <span>{member.pin ? 'Quick PIN Enabled' : 'No PIN Set'}</span>
                                </div>
                                <div style={{ 
                                    marginTop: '0.5rem',
                                    padding: '0.75rem', 
                                    borderRadius: '10px', 
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Balance</span>
                                    <span style={{ 
                                        fontSize: '0.9rem', 
                                        fontWeight: 800, 
                                        color: member.balance > 0 ? 'var(--primary)' : member.balance < 0 ? 'var(--danger)' : 'var(--text-muted)' 
                                    }}>
                                        {formatCurrency(member.balance || 0)}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                                <button onClick={() => fetchLedger(member)}
                                    className="premium-glass"
                                    title="Financial Ledger"
                                    style={{ padding: '0.65rem', borderRadius: '10px', cursor: 'pointer', color: 'var(--primary)', border: '1px solid var(--glass-border)' }}>
                                    {ledgerLoading && selectedStaffAccount?.id === member.id ? <Loader2 size={18} className="animate-spin" /> : <Banknote size={18} />}
                                </button>
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
            {isModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>{editingStaff ? 'Edit Staff' : 'Add New Staff'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input className="auth-input" placeholder="Full Name" required value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ flex: 1 }} />
                                <input className="auth-input" type="email" placeholder="Email Address" required value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ flex: 1 }} />
                            </div>

                            {!editingStaff && (
                                <input className="auth-input" type="password" placeholder="Set Login Password" required value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            )}

                            {/* Role Selection Grid */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>
                                    Assign Operational Role
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                    {Object.entries(roleConfig).map(([role, config]) => (
                                        <div 
                                            key={role}
                                            onClick={() => setFormData({ ...formData, role: role })}
                                            style={{
                                                padding: '0.75rem 0.25rem',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                background: formData.role === role ? `${config.color}15` : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${formData.role === role ? config.color : 'var(--glass-border)'}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <config.icon size={16} color={formData.role === role ? config.color : 'var(--text-muted)'} />
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: formData.role === role ? 'var(--text-main)' : 'var(--text-muted)' }}>{config.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Base Salary</label>
                                    <div className="input-with-icon">
                                        <Banknote size={16} />
                                        <input type="number" placeholder="0.00" value={formData.salary}
                                            onChange={e => setFormData({ ...formData, salary: e.target.value })} style={{ fontWeight: 700 }} />
                                    </div>
                                </div>
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <Dropdown 
                                        label="Type"
                                        placeholder="Select Type..."
                                        options={[
                                            { value: 'MONTHLY', label: 'Monthly' },
                                            { value: 'DAILY', label: 'Daily' }
                                        ]}
                                        value={formData.salaryType}
                                        onChange={val => setFormData({ ...formData, salaryType: val })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Employment Start Date</label>
                                <div className="input-with-icon">
                                    <Calendar size={16} />
                                    <input type="date" value={formData.joiningDate}
                                        onChange={e => setFormData({ ...formData, joiningDate: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
                            </div>

                            {error && <div className="error-message" style={{ margin: 0 }}>{error}</div>}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '16px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 700 }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="premium-button active"
                                    style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
                                    {submitting ? 'Saving...' : editingStaff ? 'Update Details' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmModal
                title={confirmAction.title}
                message={confirmAction.message}
                variant="danger"
            />

            {/* Financial Ledger Modal */}
            {showLedgerModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div className="modal-card" style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ margin: 0 }}>Staff Financial Ledger</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selectedStaffAccount?.name} • {selectedStaffAccount?.role}</p>
                            </div>
                            <button onClick={() => setShowLedgerModal(false)} className="icon-button"><X size={24} /></button>
                        </div>

                        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                                <span className="stat-label">Total Salary Expected</span>
                                <span className="stat-value">{formatCurrency(ledgerData.user?.salary || 0)}</span>
                            </div>
                            <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                                <span className="stat-label">Advances Taken</span>
                                <span className="stat-value" style={{ color: 'var(--danger)' }}>
                                    {formatCurrency(ledgerData.transactions.filter(t => t.type === 'ADVANCE').reduce((acc, t) => acc + t.amount, 0))}
                                </span>
                            </div>
                            <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
                                <span className="stat-label">Actual Payouts</span>
                                <span className="stat-value" style={{ color: 'var(--success)' }}>
                                    {formatCurrency(ledgerData.transactions.filter(t => t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0))}
                                </span>
                            </div>
                            <div className="stat-card" style={{ borderLeft: `4px solid ${((ledgerData.user?.salary || 0) - ledgerData.transactions.filter(t => t.type === 'ADVANCE' || t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0)) >= 0 ? 'var(--primary)' : 'var(--danger)'}` }}>
                                <span className="stat-label">Net Balance Due</span>
                                <span className="stat-value" style={{ color: ((ledgerData.user?.salary || 0) - ledgerData.transactions.filter(t => t.type === 'ADVANCE' || t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0)) >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                                    {formatCurrency((ledgerData.user?.salary || 0) - ledgerData.transactions.filter(t => t.type === 'ADVANCE' || t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0))}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
                            {/* History */}
                            <div className="premium-glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={18} /> Transaction History
                                </h3>
                                <div style={{ overflowY: 'auto', maxHeight: '400px', paddingRight: '0.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {ledgerData.transactions.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                                <TrendingUp size={32} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>No transaction history found.</p>
                                            </div>
                                        ) : ledgerData.transactions.map(t => {
                                            const typeColors = {
                                                'ADVANCE': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: 'Advance' },
                                                'PAYMENT': { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', label: 'Payout' },
                                                'BONUS': { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1', label: 'Bonus' },
                                                'FINE': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', label: 'Fine' }
                                            };
                                            const style = typeColors[t.type] || typeColors['ADVANCE'];

                                            return (
                                                <div key={t.id} style={{ 
                                                    padding: '1rem', 
                                                    borderRadius: '16px', 
                                                    background: 'rgba(255,255,255,0.02)', 
                                                    border: '1px solid var(--glass-border)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ 
                                                            width: '40px', height: '40px', borderRadius: '12px', 
                                                            background: style.bg, color: style.text,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            {t.type === 'ADVANCE' && <TrendingDown size={18} />}
                                                            {t.type === 'PAYMENT' && <Banknote size={18} />}
                                                            {t.type === 'BONUS' && <TrendingUp size={18} />}
                                                            {t.type === 'FINE' && <FileSpreadsheet size={18} />}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{style.label}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: t.type === 'ADVANCE' || t.type === 'FINE' ? '#ef4444' : '#10b981' }}>
                                                            {t.type === 'ADVANCE' || t.type === 'FINE' ? '-' : '+'}{formatCurrency(t.amount)}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {t.description || 'No remarks'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* New Transaction Form */}
                            <div className="premium-glass" style={{ padding: '2rem', borderRadius: '24px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ marginTop: 0, marginBottom: '4px', fontSize: '1.25rem', fontWeight: 800 }}>Record Transaction</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Update records for {selectedStaffAccount?.name}</p>
                                </div>

                                <form onSubmit={handleTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Transaction Type Selection */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        {[
                                            { id: 'ADVANCE', label: 'Advance', color: 'var(--danger)', icon: TrendingDown },
                                            { id: 'PAYMENT', label: 'Payout', color: 'var(--success)', icon: Banknote },
                                            { id: 'BONUS', label: 'Bonus', color: 'var(--primary)', icon: TrendingUp },
                                            { id: 'FINE', label: 'Fine', color: '#f59e0b', icon: FileSpreadsheet }
                                        ].map(type => (
                                            <div 
                                                key={type.id}
                                                onClick={() => setTransactionForm({ ...transactionForm, type: type.id })}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '16px',
                                                    cursor: 'pointer',
                                                    background: transactionForm.type === type.id ? `${type.color}15` : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${transactionForm.type === type.id ? type.color : 'var(--glass-border)'}`,
                                                    display: 'flex',
                                                    gap: '0.75rem',
                                                    alignItems: 'center',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }}
                                            >
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '10px',
                                                    background: transactionForm.type === type.id ? type.color : 'rgba(255,255,255,0.05)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: transactionForm.type === type.id ? 'white' : 'var(--text-muted)'
                                                }}>
                                                    <type.icon size={16} />
                                                </div>
                                                <span style={{ 
                                                    fontSize: '0.85rem', 
                                                    fontWeight: 700,
                                                    color: transactionForm.type === type.id ? 'var(--text-main)' : 'var(--text-muted)'
                                                }}>
                                                    {type.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                            AMOUNT (RS.)
                                        </label>
                                        <div className="input-with-icon">
                                            <Banknote size={16} />
                                            <input 
                                                type="number" 
                                                placeholder="Enter amount..." 
                                                required
                                                value={transactionForm.amount}
                                                onChange={e => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                                                style={{ fontSize: '1.2rem', fontWeight: 800 }}
                                            />
                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                            NOTES / REMARKS
                                        </label>
                                        <textarea 
                                            placeholder="Write a brief description..."
                                            value={transactionForm.description}
                                            onChange={e => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                            style={{ 
                                                background: 'var(--bg-input)', 
                                                color: 'var(--text-main)', 
                                                border: '1px solid var(--border)', 
                                                padding: '1rem', 
                                                borderRadius: '16px', 
                                                minHeight: '100px', 
                                                fontSize: '0.9rem',
                                                lineHeight: '1.5',
                                                resize: 'none',
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                outline: 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.background = 'var(--bg-card)';
                                                e.target.style.boxShadow = '0 0 12px var(--primary-glow)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border)';
                                                e.target.style.background = 'var(--bg-input)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="premium-button active" 
                                        style={{ 
                                            width: '100%', 
                                            marginTop: '0.5rem',
                                            padding: '1rem',
                                            borderRadius: '16px',
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            boxShadow: '0 10px 20px -5px var(--primary-shadow)'
                                        }}
                                   >
                                        Confirm & Save Transaction
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default StaffManagement;
