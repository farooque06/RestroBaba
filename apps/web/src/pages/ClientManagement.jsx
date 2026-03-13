import React, { useState, useEffect } from 'react';
import {
    Plus, Store, Mail, Hash, Calendar,
    ArrowUpRight, Users, Loader2, Search,
    Filter, MoreVertical, ShieldCheck,
    AlertCircle, Key, Lock, Unlock, Settings,
    UserCircle, CheckCircle2, XCircle, CreditCard,
    Clock, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import ConfirmModal from '../components/ConfirmModal';

const ClientManagement = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });
    const [plans, setPlans] = useState([]);
    const [activeFilter, setActiveFilter] = useState('ALL');

    // Selection state
    const [selectedClient, setSelectedClient] = useState(null);

    // Form State for Onboarding
    const [newClient, setNewClient] = useState({
        name: '', email: '', adminName: '', adminPassword: '',
        useTax: false, taxRate: 0, useServiceCharge: false, serviceChargeRate: 0,
        plan: 'SILVER', planDuration: '1m',
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    // Form State for Editing
    const [editClient, setEditClient] = useState({
        name: '',
        email: '',
        useTax: false,
        taxRate: 0,
        useServiceCharge: false,
        serviceChargeRate: 0,
        plan: 'SILVER',
        planDuration: '1m',
        subscriptionStart: '',
        subscriptionEnd: '',
        paymentStatus: 'PAID'
    });

    // Password Reset State
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [myPasswordData, setMyPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const [submitLoading, setSubmitLoading] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchClients(searchQuery);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/plans`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setPlans(data);
            }
        } catch (err) {
            console.error('Fetch plans error:', err);
        }
    };

    const fetchClients = async (search = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('restroToken');
            const url = search
                ? `${API_BASE_URL}/api/clients?search=${encodeURIComponent(search)}`
                : `${API_BASE_URL}/api/clients`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setClients(data);
            } else {
                setError(data.error || 'Failed to fetch clients');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const calculateExpiry = (duration) => {
        const date = new Date();
        if (duration === '12m') date.setFullYear(date.getFullYear() + 1);
        else if (duration === '3m') date.setMonth(date.getMonth() + 3);
        else date.setMonth(date.getMonth() + 1);
        return date.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (!isEditModalOpen) {
            setNewClient(prev => ({ ...prev, subscriptionEnd: calculateExpiry(prev.planDuration) }));
        }
    }, [newClient.planDuration, isEditModalOpen]);

    const handleCreateClient = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/clients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newClient)
            });
            const data = await response.json();
            if (response.ok) {
                setClients([data, ...clients]);
                setIsAddModalOpen(false);
                setNewClient({
                    name: '', email: '', adminName: '', adminPassword: '',
                    useTax: false, taxRate: 0, useServiceCharge: false, serviceChargeRate: 0,
                    plan: 'SILVER', planDuration: '1m',
                    subscriptionEnd: calculateExpiry('1m'),
                    paymentStatus: 'PAID'
                });
                toast.success('Restaurant onboarded successfully!');
            } else {
                toast.error(data.error || 'Onboarding failed');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleUpdateClient = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/clients/${selectedClient.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editClient)
            });

            if (response.ok) {
                const updated = await response.json();
                setClients(clients.map(c => c.id === selectedClient.id ? updated : c));
                setIsEditModalOpen(false);
                toast.success('Client updated successfully');
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

    const handleToggleStatus = (client) => {
        setConfirmAction({
            title: `${client.isActive ? 'Deactivate' : 'Activate'} ${client.name}?`,
            message: `Are you sure you want to ${client.isActive ? 'DEACTIVATE' : 'ACTIVATE'} this restaurant? ${client.isActive ? 'Staff will no longer be able to log in until it is reactivated.' : ''}`,
            onConfirm: () => performToggleStatus(client)
        });
        setIsConfirmModalOpen(true);
    };

    const performToggleStatus = async (client) => {
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/clients/${client.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !client.isActive })
            });

            if (response.ok) {
                setClients(clients.map(c => c.id === client.id ? { ...c, isActive: !client.isActive } : c));
                toast.success(`Client ${!client.isActive ? 'activated' : 'deactivated'} successfully`);
            } else {
                toast.error('Status update failed');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

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
                toast.success('Admin password reset successfully');
                setIsResetModalOpen(false);
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
                toast.success('Security key updated successfully');
                setIsSecurityModalOpen(false);
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

    const handleRegenerateCode = (client) => {
        setConfirmAction({
            title: `Regenerate Code for ${client.name}?`,
            message: `This will invalidate the current code (${client.shopCode}). All staff using the old code will need the new one to log in. Continue?`,
            onConfirm: () => performRegenerateCode(client)
        });
        setIsConfirmModalOpen(true);
    };

    const performRegenerateCode = async (client) => {
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/clients/${client.id}/regenerate`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setClients(clients.map(c => c.id === client.id ? { ...c, shopCode: data.shopCode } : c));
                toast.success(`New code generated: ${data.shopCode}`);
            } else {
                toast.error('Regeneration failed');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    const filteredClients = clients.filter(client => {
        const matchesSearch =
            client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.shopCode.toLowerCase().includes(searchQuery.toLowerCase());

        const clientStatus = client.isActive ? 'LIVE' : 'SUSPENDED';

        let matchesFilter = activeFilter === 'ALL' ||
            activeFilter === clientStatus ||
            activeFilter === client.plan;

        if (activeFilter === 'EXPIRING_SOON') {
            const daysLeft = client.subscriptionEnd
                ? Math.ceil((new Date(client.subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24))
                : Infinity;
            matchesFilter = daysLeft > 0 && daysLeft <= 15;
        } else if (activeFilter === 'PENDING_PAYMENT') {
            matchesFilter = client.paymentStatus === 'PENDING' || client.paymentStatus === 'OVERDUE';
        }

        return matchesSearch && matchesFilter;
    });

    if (loading && clients.length === 0) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            {/* Header Section */}
            <div className="sa-mgmt-header">
                <div className="sa-mgmt-title">
                    <h1>
                        Client Ecosystem
                        <span className="status-badge sa-badge-super">
                            <ShieldCheck size={14} /> SUPER ADMIN
                        </span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Orchestrate your network of restaurant clients and system infrastructure.</p>
                </div>
                <div className="sa-mgmt-actions">
                    <button className="btn-ghost" onClick={() => setIsSecurityModalOpen(true)}>
                        <Lock size={18} /> Credentials
                    </button>
                    <button className="btn-primary sa-btn-onboard" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={20} /> Onboard Restaurant
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="sa-mgmt-stats">
                <div className="stat-card sa-stat-card-premium">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label">Total Portfolio</span>
                            <span className="stat-value sa-stat-large">{clients.length}</span>
                        </div>
                        <div className="sa-stat-icon-bg primary">
                            <Store size={24} color="var(--primary)" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <span className="badge badge-success-light">{clients.filter(c => c.isActive).length} Active</span>
                        <span className="badge badge-subtle">{clients.filter(c => !c.isActive).length} Inactive</span>
                    </div>
                </div>

                <div className="stat-card sa-stat-card-premium">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label">System Resilience</span>
                            <span className="stat-value sa-stat-large sa-text-success">99.9%</span>
                        </div>
                        <div className="sa-stat-icon-bg success">
                            <ShieldCheck size={24} color="#10b981" />
                        </div>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '1.5rem' }}>Infrastructure health is optimal.</span>
                </div>

                <div className="stat-card sa-stat-card-premium">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label">Security Layer</span>
                            <span className="stat-value sa-stat-medium">E2EE Active</span>
                        </div>
                        <div className="sa-stat-icon-bg warning">
                            <Key size={24} color="#fbbf24" />
                        </div>
                    </div>
                    <div style={{ marginTop: '1.5rem' }}>
                        <span className="badge badge-warning-light">AES-256 Enforced</span>
                    </div>
                </div>
            </div>

            {/* Client Registry & Filters */}
            <div className="sa-mgmt-controls-container">
                <div className="sa-mgmt-controls">
                    <div className="search-bar sa-search-premium">
                        <Search size={20} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or shop code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="sa-search-clear">
                                <XCircle size={18} />
                            </button>
                        )}
                    </div>

                    <div className="sa-mgmt-filters">
                        {['ALL', 'LIVE', 'SUSPENDED', 'EXPIRING_SOON', 'PENDING_PAYMENT', 'SILVER', 'GOLD', 'DIAMOND'].map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`pill-btn ${activeFilter === f ? 'active' : ''}`}
                            >
                                {f.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="sa-mgmt-grid">
                {filteredClients.length === 0 ? (
                    <div className="premium-glass" style={{ gridColumn: '1 / -1', padding: '6rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Search size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                        <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>No restaurant entities found.</p>
                        <p style={{ opacity: 0.6 }}>Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    filteredClients.map(client => (
                        <div
                            key={client.id}
                            className="premium-glass animate-slideUp"
                            style={{
                                padding: '1.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.5rem',
                                border: '1px solid var(--border)',
                                opacity: client.isActive ? 1 : 0.8,
                                background: client.isActive ? 'rgba(255,255,255,0.02)' : 'rgba(239, 68, 68, 0.02)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                cursor: 'default'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '18px',
                                        background: client.isActive ? 'var(--primary-glow)' : 'rgba(239, 68, 68, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Store size={28} color={client.isActive ? 'var(--primary)' : '#ef4444'} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '4px' }}>{client.name}</h3>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Mail size={12} /> {client.email}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.1em' }}>
                                            <Hash size={11} /> {client.shopCode || '------'}
                                        </div>
                                    </div>
                                </div>
                                <div className={`plan-tag ${client.plan?.toLowerCase() || 'silver'}`} style={{ margin: 0, padding: '4px 10px', fontSize: '0.7rem' }}>
                                    {client.plan}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="stat-card" style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Subscription</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={16} color={
                                            (() => {
                                                const days = Math.ceil((new Date(client.subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24));
                                                return days < 3 ? '#ef4444' : days < 15 ? '#fbbf24' : 'var(--primary)';
                                            })()
                                        } />
                                        <span style={{ fontWeight: 700 }}>
                                            {(() => {
                                                const days = Math.ceil((new Date(client.subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24));
                                                return days <= 0 ? 'Expired' : `${days}d left`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Payment</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <CreditCard size={16} color={client.paymentStatus === 'PAID' ? 'var(--success)' : '#ef4444'} />
                                        <span style={{ fontWeight: 700, color: client.paymentStatus === 'PAID' ? 'inherit' : '#ef4444' }}>
                                            {client.paymentStatus || 'UNSET'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: client.isActive ? 'var(--success)' : 'var(--danger)' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: client.isActive ? 'var(--success)' : 'var(--danger)' }}>
                                        {client.isActive ? 'LIVE SYSTEM' : 'SUSPENDED'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="icon-btn-ghost"
                                        title="System Settings"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', width: '38px', height: '38px' }}
                                        onClick={() => {
                                            setSelectedClient(client);
                                            setEditClient({
                                                name: client.name,
                                                email: client.email,
                                                useTax: client.useTax,
                                                taxRate: client.taxRate,
                                                useServiceCharge: client.useServiceCharge,
                                                serviceChargeRate: client.serviceChargeRate,
                                                plan: client.plan || 'SILVER',
                                                planDuration: client.planDuration || '1m',
                                                subscriptionStart: client.subscriptionStart ? new Date(client.subscriptionStart).toISOString().split('T')[0] : '',
                                                subscriptionEnd: client.subscriptionEnd ? new Date(client.subscriptionEnd).toISOString().split('T')[0] : '',
                                                paymentStatus: client.paymentStatus || 'PAID'
                                            });
                                            setIsEditModalOpen(true);
                                        }}
                                    >
                                        <Settings size={18} />
                                    </button>
                                    <button
                                        className="icon-btn-ghost"
                                        title="Reset Password"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', width: '38px', height: '38px' }}
                                        onClick={() => {
                                            setSelectedClient(client);
                                            setIsResetModalOpen(true);
                                        }}
                                    >
                                        <Key size={18} />
                                    </button>
                                    <button
                                        className="icon-btn-ghost"
                                        title={client.isActive ? "Restrict Access" : "Grant Access"}
                                        style={{ background: client.isActive ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${client.isActive ? '#ef444433' : '#10b98133'}`, borderRadius: '12px', width: '38px', height: '38px' }}
                                        onClick={() => handleToggleStatus(client)}
                                    >
                                        {client.isActive ? <Lock size={18} color="#ef4444" /> : <Unlock size={18} color="#10b981" />}
                                    </button>
                                    <button
                                        className="icon-btn-ghost"
                                        title="Rotation & Security"
                                        style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: '12px', width: '38px', height: '38px' }}
                                        onClick={() => handleRegenerateCode(client)}
                                    >
                                        <Hash size={18} color="var(--primary)" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Onboarding Modal */}
            {isAddModalOpen && (
                <div className="modal-overlay animate-fade" style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-content animate-slideUp premium-glass" style={{ maxWidth: '600px', border: '1px solid var(--border)', padding: '2.5rem' }}>
                        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', background: 'var(--primary-glow)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifySelf: 'center', marginBottom: '1.25rem', margin: '0 auto 1rem' }}>
                                <Plus size={32} color="var(--primary)" />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>Provision Restaurant</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Deploy a new restaurant node into the ecosystem.</p>
                        </div>

                        <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Section: Entity Identity */}
                            <div>
                                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Store size={14} /> Entity Identity
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="input-group">
                                        <label>Restaurant Legal Name</label>
                                        <div className="input-wrapper">
                                            <Store size={18} />
                                            <input type="text" placeholder="e.g. Royal Orchid Bistro" value={newClient.name || ''}
                                                onChange={e => setNewClient({ ...newClient, name: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Primary Administrative Email</label>
                                        <div className="input-wrapper">
                                            <Mail size={18} />
                                            <input type="email" placeholder="admin@restaurant.com" value={newClient.email || ''}
                                                onChange={e => setNewClient({ ...newClient, email: e.target.value })} required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Admin Authentication */}
                            <div>
                                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Lock size={14} /> Lead Authentication
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div className="input-group">
                                        <label>Full Name</label>
                                        <div className="input-wrapper">
                                            <UserCircle size={18} />
                                            <input type="text" placeholder="Primary Owner" value={newClient.adminName || ''}
                                                onChange={e => setNewClient({ ...newClient, adminName: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Secure Password</label>
                                        <div className="input-wrapper">
                                            <Key size={18} />
                                            <input type="password" placeholder="••••••••" value={newClient.adminPassword || ''}
                                                onChange={e => setNewClient({ ...newClient, adminPassword: e.target.value })} required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Financial & Tax */}
                            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                            <input type="checkbox" checked={newClient.useTax} onChange={e => setNewClient({ ...newClient, useTax: e.target.checked })}
                                                style={{ width: '18px', height: '18px' }} />
                                            Enable VAT Compliance
                                        </label>
                                        <div className="input-wrapper" style={{ opacity: newClient.useTax ? 1 : 0.4 }}>
                                            <input type="number" step="0.01" placeholder="13" value={newClient.taxRate || 0}
                                                onChange={e => setNewClient({ ...newClient, taxRate: e.target.value })} disabled={!newClient.useTax}
                                                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} />
                                            <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>%</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                            <input type="checkbox" checked={newClient.useServiceCharge} onChange={e => setNewClient({ ...newClient, useServiceCharge: e.target.checked })}
                                                style={{ width: '18px', height: '18px' }} />
                                            Service Charge
                                        </label>
                                        <div className="input-wrapper" style={{ opacity: newClient.useServiceCharge ? 1 : 0.4 }}>
                                            <input type="number" step="0.01" placeholder="10" value={newClient.serviceChargeRate || 0}
                                                onChange={e => setNewClient({ ...newClient, serviceChargeRate: e.target.value })} disabled={!newClient.useServiceCharge}
                                                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} />
                                            <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Subscription Tier */}
                            <div>
                                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldCheck size={14} /> Ecosystem Tier
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                    {plans.map(p => {
                                        const color = p.tier === 'GOLD' ? '#fbbf24' : p.tier === 'DIAMOND' ? '#38bdf8' : '#94a3b8';
                                        const isActive = newClient.plan === p.tier;
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => setNewClient({ ...newClient, plan: p.tier })}
                                                className={`plan-card-mini ${isActive ? 'active' : ''}`}
                                                style={{
                                                    padding: '1.25rem 0.5rem',
                                                    borderRadius: '18px',
                                                    border: `2px solid ${isActive ? color : 'transparent'}`,
                                                    background: isActive ? `${color}15` : 'rgba(255,255,255,0.03)',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div style={{
                                                    padding: '8px',
                                                    borderRadius: '12px',
                                                    background: isActive ? color : 'rgba(255,255,255,0.05)',
                                                    color: isActive ? 'black' : 'var(--text-muted)',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    <ShieldCheck size={20} />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: isActive ? color : 'var(--text-muted)' }}>{p.tier}</span>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                                    Rs. {p.offerMonthly || p.monthlyPrice}/mo
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                                    {[
                                        { id: '1m', label: 'Monthly' },
                                        { id: '3m', label: 'Quarterly' },
                                        { id: '12m', label: 'Annual' }
                                    ].map(d => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={() => setNewClient({ ...newClient, planDuration: d.id })}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                borderRadius: '12px',
                                                border: `1px solid ${newClient.planDuration === d.id ? 'var(--primary)' : 'var(--border)'}`,
                                                background: newClient.planDuration === d.id ? 'var(--primary-glow)' : 'transparent',
                                                color: newClient.planDuration === d.id ? 'var(--primary)' : 'var(--text-muted)',
                                                fontSize: '0.85rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Lifecycle & Billing */}
                            <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)' }}>
                                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={16} /> Lifecycle & Billing
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Subscription Expiry</label>
                                        <div className="input-wrapper" style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '16px',
                                            padding: '4px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <Calendar size={18} color="var(--primary)" />
                                            <input
                                                type="date"
                                                value={newClient.subscriptionEnd || ''}
                                                onChange={e => setNewClient({ ...newClient, subscriptionEnd: e.target.value })}
                                                required
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    padding: '12px 0',
                                                    fontSize: '1rem',
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    width: '100%',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Payment Status</label>
                                        <div className="input-wrapper" style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '16px',
                                            padding: '4px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            position: 'relative'
                                        }}>
                                            <CreditCard size={18} color="var(--primary)" />
                                            <select
                                                value={newClient.paymentStatus || 'PAID'}
                                                onChange={e => setNewClient({ ...newClient, paymentStatus: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    padding: '12px 0',
                                                    fontSize: '1rem',
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    appearance: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="PAID" style={{ background: 'var(--bg-card)', color: 'white' }}>✓ MARK AS PAID</option>
                                                <option value="PENDING" style={{ background: 'var(--bg-card)', color: 'white' }}>⌛ PENDING</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-ghost" onClick={() => setIsAddModalOpen(false)} style={{ flex: 1, padding: '1rem' }}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 2, padding: '1rem', borderRadius: '16px', boxShadow: '0 10px 20px -5px var(--primary-glow)' }}>
                                    {submitLoading ? <Loader2 className="animate-spin" /> : 'Confirm Provisioning'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
            {isEditModalOpen && (
                <div className="modal-overlay animate-fade" style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-content animate-slideUp premium-glass" style={{ maxWidth: '600px', border: '1px solid var(--border)', padding: '2.5rem' }}>
                        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', background: 'var(--primary-glow)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifySelf: 'center', margin: '0 auto 1rem' }}>
                                <Settings size={32} color="var(--primary)" />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>System Orchestration</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Updating core parameters for <strong>{selectedClient?.name}</strong>.</p>
                        </div>

                        <form onSubmit={handleUpdateClient} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Section: Entity Identity */}
                            <div>
                                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Store size={14} /> Entity Identity
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="input-group">
                                        <label>Restaurant Legal Name</label>
                                        <div className="input-wrapper">
                                            <Store size={18} />
                                            <input type="text" placeholder="e.g. Royal Orchid Bistro" value={editClient.name || ''}
                                                onChange={e => setEditClient({ ...editClient, name: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Primary Administrative Email</label>
                                        <div className="input-wrapper">
                                            <Mail size={18} />
                                            <input type="email" placeholder="admin@restaurant.com" value={editClient.email || ''}
                                                onChange={e => setEditClient({ ...editClient, email: e.target.value })} required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Financial & Tax */}
                            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                            <input type="checkbox" checked={editClient.useTax} onChange={e => setEditClient({ ...editClient, useTax: e.target.checked })}
                                                style={{ width: '18px', height: '18px' }} />
                                            VAT Override
                                        </label>
                                        <div className="input-wrapper" style={{ opacity: editClient.useTax ? 1 : 0.4 }}>
                                            <input type="number" step="0.01" placeholder="13" value={editClient.taxRate || 0}
                                                onChange={e => setEditClient({ ...editClient, taxRate: e.target.value })} disabled={!editClient.useTax}
                                                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} />
                                            <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>%</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                            <input type="checkbox" checked={editClient.useServiceCharge} onChange={e => setEditClient({ ...editClient, useServiceCharge: e.target.checked })}
                                                style={{ width: '18px', height: '18px' }} />
                                            Service Charge
                                        </label>
                                        <div className="input-wrapper" style={{ opacity: editClient.useServiceCharge ? 1 : 0.4 }}>
                                            <input type="number" step="0.01" placeholder="10" value={editClient.serviceChargeRate || 0}
                                                onChange={e => setEditClient({ ...editClient, serviceChargeRate: e.target.value })} disabled={!editClient.useServiceCharge}
                                                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} />
                                            <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Subscription Tier */}
                            <div>
                                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldCheck size={14} /> Ecosystem Tier
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                    {plans.map(p => {
                                        const color = p.tier === 'GOLD' ? '#fbbf24' : p.tier === 'DIAMOND' ? '#38bdf8' : '#94a3b8';
                                        const isActive = editClient.plan === p.tier;
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => setEditClient({ ...editClient, plan: p.tier })}
                                                className={`plan-card-mini ${isActive ? 'active' : ''}`}
                                                style={{
                                                    padding: '1.25rem 0.5rem',
                                                    borderRadius: '18px',
                                                    border: `2px solid ${isActive ? color : 'transparent'}`,
                                                    background: isActive ? `${color}15` : 'rgba(255,255,255,0.03)',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div style={{
                                                    padding: '8px',
                                                    borderRadius: '12px',
                                                    background: isActive ? color : 'rgba(255,255,255,0.05)',
                                                    color: isActive ? 'black' : 'var(--text-muted)',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    <ShieldCheck size={20} />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: isActive ? color : 'var(--text-muted)' }}>{p.tier}</span>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                                    Rs. {p.offerMonthly || p.monthlyPrice}/mo
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                                    {[
                                        { id: '1m', label: 'Monthly' },
                                        { id: '3m', label: 'Quarterly' },
                                        { id: '12m', label: 'Annual' }
                                    ].map(d => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={() => setEditClient({ ...editClient, planDuration: d.id })}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                borderRadius: '12px',
                                                border: `1px solid ${editClient.planDuration === d.id ? 'var(--primary)' : 'var(--border)'}`,
                                                background: editClient.planDuration === d.id ? 'var(--primary-glow)' : 'transparent',
                                                color: editClient.planDuration === d.id ? 'var(--primary)' : 'var(--text-muted)',
                                                fontSize: '0.85rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Lifecycle & Billing */}
                            <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)' }}>
                                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={16} /> Lifecycle & Billing
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Subscription Expiry</label>
                                        <div className="input-wrapper" style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '16px',
                                            padding: '4px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <Calendar size={18} color="var(--primary)" />
                                            <input
                                                type="date"
                                                value={editClient.subscriptionEnd || ''}
                                                onChange={e => setEditClient({ ...editClient, subscriptionEnd: e.target.value })}
                                                required
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    padding: '12px 0',
                                                    fontSize: '1rem',
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    width: '100%',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            {[
                                                { m: 1, label: '+1 Month' },
                                                { m: 3, label: '+3 Months' },
                                                { m: 12, label: '+1 Year' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.m}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = editClient.subscriptionEnd ? new Date(editClient.subscriptionEnd) : new Date();
                                                        const now = new Date();
                                                        const base = current > now ? current : now;
                                                        const fresh = new Date(base);
                                                        fresh.setMonth(fresh.getMonth() + opt.m);
                                                        setEditClient({ ...editClient, subscriptionEnd: fresh.toISOString().split('T')[0] });
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        border: '1px solid var(--border)',
                                                        color: 'var(--primary)',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'var(--primary-glow)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Payment Status</label>
                                        <div className="input-wrapper" style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '16px',
                                            padding: '4px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            position: 'relative'
                                        }}>
                                            <CreditCard size={18} color="var(--primary)" />
                                            <select
                                                value={editClient.paymentStatus || 'PAID'}
                                                onChange={e => setEditClient({ ...editClient, paymentStatus: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    padding: '12px 0',
                                                    fontSize: '1rem',
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    appearance: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="PAID" style={{ background: 'var(--bg-card)', color: 'white' }}>✓ MARK AS PAID</option>
                                                <option value="PENDING" style={{ background: 'var(--bg-card)', color: 'white' }}>⌛ PENDING</option>
                                                <option value="OVERDUE" style={{ background: 'var(--bg-card)', color: 'white' }}>⚠ OVERDUE</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-ghost" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, padding: '1rem' }}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 2, padding: '1rem', borderRadius: '16px', boxShadow: '0 10px 20px -5px var(--primary-glow)' }}>
                                    {submitLoading ? <Loader2 className="animate-spin" /> : 'Synchronize Node'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Client Password Reset Modal */}
            {isResetModalOpen && (
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
                                <button type="button" className="btn-ghost" onClick={() => setIsResetModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 2 }}>
                                    {submitLoading ? <Loader2 className="animate-spin" /> : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Security Modal */}
            {isSecurityModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div className="modal-card animate-fade-in" style={{ width: '420px', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <ShieldCheck color="var(--primary)" size={24} />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Security</h2>
                            </div>
                            <button onClick={() => setIsSecurityModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
                                    <ShieldCheck size={18} />
                                    <input
                                        type="password"
                                        className="auth-input"
                                        required
                                        value={myPasswordData.confirmPassword || ''}
                                        onChange={e => setMyPasswordData({ ...myPasswordData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitLoading}
                                className="nav-item active"
                                style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                {submitLoading ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />}
                                Update Password
                            </button>
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
                variant={confirmAction.title.includes('Deactivate') ? 'danger' : 'primary'}
            />
        </div>
    );
};

export default ClientManagement;
