import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { 
    Search, 
    Filter, 
    MoreVertical, 
    Mail, 
    Phone, 
    MapPin, 
    Clock, 
    CheckCircle, 
    XCircle, 
    Trash2,
    Loader2,
    Plus,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const LeadManagement = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/leads`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setLeads(data);
            }
        } catch (err) {
            toast.error('Failed to fetch leads');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                toast.success(`Status updated to ${newStatus}`);
                fetchLeads(true);
            }
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const deleteLead = async (id) => {
        if (!window.confirm('Are you sure you want to delete this lead?')) return;
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success('Lead deleted');
                fetchLeads(true);
            }
        } catch (err) {
            toast.error('Failed to delete lead');
        }
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = 
            lead.restaurantName.toLowerCase().includes(search.toLowerCase()) ||
            lead.ownerName.toLowerCase().includes(search.toLowerCase()) ||
            lead.email.toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'var(--warning)';
            case 'CONTACTED': return 'var(--primary)';
            case 'REJECTED': return '#ef4444';
            default: return 'var(--text-muted)';
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Restro Requests</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage incoming interest requests from potential restaurant owners.</p>
                </div>
                <button onClick={() => fetchLeads()} className="premium-glass" style={{ padding: '0.8rem', borderRadius: '12px' }}>
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="billing-controls" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
                    <div className="search-box" style={{ flex: 1, minWidth: '300px' }}>
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by restaurant, owner or email..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['ALL', 'PENDING', 'CONTACTED', 'REJECTED'].map(status => (
                            <button
                                key={status}
                                className={`toggle-btn ${statusFilter === status ? 'active' : ''}`}
                                onClick={() => setStatusFilter(status)}
                                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                            >
                                {status === 'ALL' && <RefreshCw size={14} />}
                                {status === 'PENDING' && <Clock size={14} />}
                                {status === 'CONTACTED' && <CheckCircle size={14} />}
                                {status === 'REJECTED' && <XCircle size={14} />}
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="table-container premium-glass">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ textAlign: 'left', padding: '1.25rem' }}>Restaurant</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem' }}>Contact Details</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem' }}>Location</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem' }}>Date</th>
                            <th style={{ textAlign: 'center', padding: '1.25rem' }}>Status</th>
                            <th style={{ textAlign: 'right', padding: '1.25rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeads.map(lead => (
                            <tr key={lead.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.2rem' }}>{lead.restaurantName}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Owner: {lead.ownerName}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                                        <Mail size={14} color="var(--primary)" />
                                        {lead.email}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <Phone size={14} color="var(--primary)" />
                                        {lead.phone}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <MapPin size={14} color="var(--text-muted)" />
                                        {lead.location || 'Not provided'}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {format(new Date(lead.createdAt), 'MMM dd, yyyy')}<br/>
                                    {format(new Date(lead.createdAt), 'hh:mm a')}
                                </td>
                                <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                                    <span style={{ 
                                        padding: '0.4rem 0.8rem', 
                                        borderRadius: '20px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 800,
                                        background: `${getStatusColor(lead.status)}15`,
                                        color: getStatusColor(lead.status),
                                        border: `1px solid ${getStatusColor(lead.status)}30`
                                    }}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        {lead.status !== 'CONTACTED' && (
                                            <button 
                                                onClick={() => updateStatus(lead.id, 'CONTACTED')}
                                                className="premium-glass" 
                                                style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)' }}
                                                title="Mark as Contacted"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                        )}
                                        {lead.status !== 'REJECTED' && (
                                            <button 
                                                onClick={() => updateStatus(lead.id, 'REJECTED')}
                                                className="premium-glass" 
                                                style={{ padding: '0.5rem', borderRadius: '8px', color: '#ef4444' }}
                                                title="Reject Request"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => deleteLead(lead.id)}
                                            className="premium-glass" 
                                            style={{ padding: '0.5rem', borderRadius: '8px', color: '#6b7280' }}
                                            title="Delete Lead"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredLeads.length === 0 && (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>No interest requests found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeadManagement;
