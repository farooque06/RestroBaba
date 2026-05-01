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
import CardErrorBoundary from '../components/CardErrorBoundary';
import Dropdown from '../components/common/Dropdown';
import { API_BASE_URL } from '../config';
import ConfirmModal from '../components/ConfirmModal';
import AccountingTerminal from '../components/ClientManagement/AccountingTerminal';
import ClientPasswordResetModal from '../components/ClientManagement/ClientPasswordResetModal';
import MySecurityModal from '../components/ClientManagement/MySecurityModal';
import ClientFormModal from '../components/ClientManagement/ClientFormModal';

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
    const [isAccountingModalOpen, setIsAccountingModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });
    const [plans, setPlans] = useState([]);
    const [activeFilter, setActiveFilter] = useState('ALL');

    // Selection state
    const [selectedClient, setSelectedClient] = useState(null);

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
                    filteredClients.map(client => {
                        let daysLeft = Infinity;
                        let isExpired = false;
                        let isExpiringSoon = false;

                        try {
                            if (client.subscriptionEnd) {
                                const subEnd = new Date(client.subscriptionEnd);
                                if (!isNaN(subEnd.getTime())) {
                                    daysLeft = Math.ceil((subEnd - new Date()) / (1000 * 60 * 60 * 24));
                                    isExpired = daysLeft <= 0;
                                    isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
                                }
                            }
                        } catch (e) {
                            console.error("Date calculation error for client:", client.name, e);
                        }

                        return (
                            <CardErrorBoundary key={client.id}>
                                <div
                                    className="premium-glass animate-slideUp"
                                    style={{
                                        padding: '1.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1.5rem',
                                        border: isExpired ? '1px solid #ef4444' : isExpiringSoon ? '1px solid #f59e0b' : '1px solid var(--border)',
                                        opacity: client.isActive ? 1 : 0.8,
                                        background: isExpired ? 'rgba(239, 68, 68, 0.08)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.05)' : client.isActive ? 'rgba(255,255,255,0.02)' : 'rgba(239, 68, 68, 0.02)',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        cursor: 'default',
                                        boxShadow: isExpired ? '0 0 15px rgba(239, 68, 68, 0.1)' : 'none'
                                    }}
                                >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '18px',
                                        background: isExpired ? 'rgba(239, 68, 68, 0.2)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.2)' : client.isActive ? 'var(--primary-glow)' : 'rgba(239, 68, 68, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Store size={28} color={isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : client.isActive ? 'var(--primary)' : '#ef4444'} />
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
                                        <Clock size={16} color={isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : 'var(--primary)'} />
                                        <span style={{ fontWeight: 700 }}>
                                            {daysLeft === Infinity ? 'Lifetime' : daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                                        </span>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Payment</span>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CreditCard size={16} color={client.balance > 0 ? '#fbbf24' : (client.paymentStatus === 'PAID' ? 'var(--success)' : '#ef4444')} />
                                            <span style={{ fontWeight: 700, color: client.balance > 0 ? '#fbbf24' : (client.paymentStatus === 'PAID' ? 'inherit' : '#ef4444') }}>
                                                {client.balance > 0 ? 'PARTIAL' : (client.paymentStatus || 'UNSET')}
                                            </span>
                                        </div>
                                        {client.balance > 0 && (
                                            <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800, marginTop: '2px' }}>
                                                Bal: Rs. {client.balance.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : client.isActive ? 'var(--success)' : 'var(--danger)' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : client.isActive ? 'var(--success)' : 'var(--danger)' }}>
                                        {isExpired ? 'EXPIRED' : isExpiringSoon ? 'EXPIRING SOON' : client.isActive ? 'LIVE SYSTEM' : 'SUSPENDED'}
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
                                                subscriptionStart: (() => {
                                                    if (!client.subscriptionStart) return '';
                                                    const d = new Date(client.subscriptionStart);
                                                    return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
                                                })(),
                                                subscriptionEnd: (() => {
                                                    if (!client.subscriptionEnd) return '';
                                                    const d = new Date(client.subscriptionEnd);
                                                    return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
                                                })(),
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
                                        title="Accounting & Payments"
                                        style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b98133', borderRadius: '12px', width: '38px', height: '38px' }}
                                        onClick={() => {
                                            setSelectedClient(client);
                                            setIsAccountingModalOpen(true);
                                        }}
                                    >
                                        <CreditCard size={18} color="#10b981" />
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
                            </CardErrorBoundary>
                        );
                    })
                )}
            </div>

            <ClientFormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} mode="add" clients={clients} setClients={setClients} plans={plans} />
            <ClientFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} mode="edit" initialData={selectedClient} clients={clients} setClients={setClients} plans={plans} />
            <ClientPasswordResetModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} selectedClient={selectedClient} />
            <MySecurityModal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} />
            <AccountingTerminal isOpen={isAccountingModalOpen} onClose={() => setIsAccountingModalOpen(false)} selectedClient={selectedClient} setSelectedClient={setSelectedClient} plans={plans} fetchClients={fetchClients} searchQuery={searchQuery} />
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={() => {
                    confirmAction.onConfirm();
                    setIsConfirmModalOpen(false);
                }}
                title={confirmAction.title}
                message={confirmAction.message}
            />
        </div>
    );
};

export default ClientManagement;
