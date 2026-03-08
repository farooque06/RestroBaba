import React, { useState, useEffect } from 'react';
import {
    Plus, Store, Mail, Hash, Calendar,
    ArrowUpRight, Users, Loader2, Search,
    Filter, MoreVertical, ShieldCheck,
    AlertCircle, Key, Lock, Unlock, Settings,
    UserCircle, CheckCircle2, XCircle
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

    // Selection state
    const [selectedClient, setSelectedClient] = useState(null);

    // Form State for Onboarding
    const [newClient, setNewClient] = useState({
        name: '',
        email: '',
        adminName: '',
        adminPassword: '',
        useTax: false,
        taxRate: 0,
        useServiceCharge: false,
        serviceChargeRate: 0
    });

    // Form State for Editing
    const [editClient, setEditClient] = useState({
        name: '',
        email: '',
        useTax: false,
        taxRate: 0,
        useServiceCharge: false,
        serviceChargeRate: 0
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
                    useTax: false, taxRate: 0, useServiceCharge: false, serviceChargeRate: 0
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

    if (loading && clients.length === 0) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        Client Ecosystem <span className="status-badge"><ShieldCheck size={14} /> SUPER ADMIN</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your network of restaurant clients and system access.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-ghost" onClick={() => setIsSecurityModalOpen(true)} style={{ gap: '8px' }}>
                        <Settings size={18} /> My Security
                    </button>
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ padding: '0.75rem 1.5rem', gap: '8px' }}>
                        <Plus size={18} /> Onboard New Restaurant
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="stat-card">
                    <span className="stat-label">Total Clients</span>
                    <span className="stat-value">{clients.length}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="badge badge-primary">{clients.filter(c => c.isActive).length} Active</span>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{clients.filter(c => !c.isActive).length} Off</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-label">System Health</span>
                    <span className="stat-value" style={{ color: 'var(--success)' }}>Optimal</span>
                    <span className="badge badge-success">99.9% Uptime</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Security Protocol</span>
                    <span className="stat-value" style={{ fontSize: '1.25rem' }}>TOTP 2FA</span>
                    <span className="badge badge-warning">Enforced</span>
                </div>
            </div>

            {/* Client List */}
            <div className="premium-glass" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Registered Restaurants</h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="search-bar" style={{ width: '300px', background: 'var(--bg-main)' }}>
                            <Search size={16} color="var(--text-muted)" />
                            <input
                                type="text"
                                placeholder="Search name, email, or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(0,0,0,0.02)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Restaurant</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shop Code</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Users</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <Search size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                        <p>No restaurants found matching your search.</p>
                                    </td>
                                </tr>
                            ) : (
                                clients.map(client => (
                                    <tr key={client.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border)', opacity: client.isActive ? 1 : 0.6 }}>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: client.isActive ? 'var(--primary-gradient)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: client.isActive ? 'white' : 'var(--text-muted)' }}>
                                                    <Store size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{client.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{client.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            {client.isActive ? (
                                                <span className="badge badge-success" style={{ gap: '4px' }}><CheckCircle2 size={12} /> Active</span>
                                            ) : (
                                                <span className="badge" style={{ gap: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><XCircle size={12} /> Suspended</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <span className="badge badge-primary" style={{ letterSpacing: '0.1em', fontWeight: 800 }}>{client.shopCode}</span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Users size={14} color="var(--text-muted)" />
                                                <span>{client._count?.users || 0} Staff</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="icon-btn-ghost"
                                                    title="Edit Details"
                                                    onClick={() => {
                                                        setSelectedClient(client);
                                                        setEditClient({ name: client.name, email: client.email });
                                                        setIsEditModalOpen(true);
                                                    }}
                                                >
                                                    <Settings size={18} />
                                                </button>
                                                <button
                                                    className="icon-btn-ghost"
                                                    title={client.isActive ? "Deactivate" : "Activate"}
                                                    onClick={() => handleToggleStatus(client)}
                                                >
                                                    {client.isActive ? <Lock size={18} color="#ef4444" /> : <Unlock size={18} color="var(--success)" />}
                                                </button>
                                                <button
                                                    className="icon-btn-ghost"
                                                    title="Reset Admin Password"
                                                    onClick={() => {
                                                        setSelectedClient(client);
                                                        setIsResetModalOpen(true);
                                                    }}
                                                >
                                                    <Key size={18} />
                                                </button>
                                                <button
                                                    className="icon-btn-ghost"
                                                    title="Regenerate Shop Code"
                                                    onClick={() => handleRegenerateCode(client)}
                                                >
                                                    <Hash size={18} color="var(--primary)" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Onboarding Modal */}
            {isAddModalOpen && (
                <div className="modal-overlay animate-fade">
                    <div className="modal-content animate-slideUp" style={{ maxWidth: '500px' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Onboard Restaurant</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Provision a new client unit and its administrator account.</p>
                        </div>
                        <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="input-group">
                                <label>Restaurant Name</label>
                                <div className="input-wrapper">
                                    <Store size={18} />
                                    <input type="text" placeholder="e.g. Blue Lagoon" value={newClient.name || ''}
                                        onChange={e => setNewClient({ ...newClient, name: e.target.value })} required />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Admin Contact Email (Primary)</label>
                                <div className="input-wrapper">
                                    <Mail size={18} />
                                    <input type="email" placeholder="admin@restaurant.com" value={newClient.email || ''}
                                        onChange={e => setNewClient({ ...newClient, email: e.target.value })} required />
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Used for system login and critical alerts.</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label>Admin Full Name</label>
                                    <div className="input-wrapper">
                                        <UserCircle size={18} />
                                        <input type="text" placeholder="Owner Name" value={newClient.adminName || ''}
                                            onChange={e => setNewClient({ ...newClient, adminName: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Initial Password</label>
                                    <div className="input-wrapper">
                                        <Lock size={18} />
                                        <input type="password" placeholder="••••••••" value={newClient.adminPassword || ''}
                                            onChange={e => setNewClient({ ...newClient, adminPassword: e.target.value })} required />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input type="checkbox" checked={newClient.useTax} onChange={e => setNewClient({ ...newClient, useTax: e.target.checked })} />
                                        Enable VAT (%)
                                    </label>
                                    <div className="input-wrapper" style={{ opacity: newClient.useTax ? 1 : 0.5 }}>
                                        <input type="number" step="0.01" placeholder="13" value={newClient.taxRate || 0}
                                            onChange={e => setNewClient({ ...newClient, taxRate: e.target.value })} disabled={!newClient.useTax} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input type="checkbox" checked={newClient.useServiceCharge} onChange={e => setNewClient({ ...newClient, useServiceCharge: e.target.checked })} />
                                        Enable Ser. Charge (%)
                                    </label>
                                    <div className="input-wrapper" style={{ opacity: newClient.useServiceCharge ? 1 : 0.5 }}>
                                        <input type="number" step="0.01" placeholder="10" value={newClient.serviceChargeRate || 0}
                                            onChange={e => setNewClient({ ...newClient, serviceChargeRate: e.target.value })} disabled={!newClient.useServiceCharge} />
                                    </div>
                                </div>
                            </div>

                            <div className="premium-glass" style={{ padding: '0.75rem', background: 'rgba(52, 152, 219, 0.05)', border: '1px dashed var(--primary)' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                    <Hash size={14} /> Shop Code will be auto-generated upon creation.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-ghost" onClick={() => setIsAddModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 2 }}>
                                    {submitLoading ? <Loader2 className="animate-spin" /> : 'Create Restaurant'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
            {isEditModalOpen && (
                <div className="modal-overlay animate-fade">
                    <div className="modal-content animate-slideUp" style={{ maxWidth: '400px' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Update Restaurant</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Modifying core details for <strong>{selectedClient?.name}</strong>.</p>
                        </div>
                        <form onSubmit={handleUpdateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="input-group">
                                <label>Restaurant Name</label>
                                <div className="input-wrapper">
                                    <Store size={18} />
                                    <input type="text" value={editClient.name || ''}
                                        onChange={e => setEditClient({ ...editClient, name: e.target.value })} required />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Admin Contact Email</label>
                                <div className="input-wrapper">
                                    <Mail size={18} />
                                    <input type="email" value={editClient.email || ''}
                                        onChange={e => setEditClient({ ...editClient, email: e.target.value })} required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input type="checkbox" checked={editClient.useTax} onChange={e => setEditClient({ ...editClient, useTax: e.target.checked })} />
                                        VAT (%)
                                    </label>
                                    <div className="input-wrapper" style={{ opacity: editClient.useTax ? 1 : 0.5 }}>
                                        <input type="number" step="0.01" value={editClient.taxRate || 0}
                                            onChange={e => setEditClient({ ...editClient, taxRate: e.target.value })} disabled={!editClient.useTax} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input type="checkbox" checked={editClient.useServiceCharge} onChange={e => setEditClient({ ...editClient, useServiceCharge: e.target.checked })} />
                                        SC (%)
                                    </label>
                                    <div className="input-wrapper" style={{ opacity: editClient.useServiceCharge ? 1 : 0.5 }}>
                                        <input type="number" step="0.01" value={editClient.serviceChargeRate || 0}
                                            onChange={e => setEditClient({ ...editClient, serviceChargeRate: e.target.value })} disabled={!editClient.useServiceCharge} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="button" className="btn-ghost" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 2 }}>
                                    {submitLoading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
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
