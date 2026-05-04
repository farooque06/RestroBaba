import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
    Users,
    Search,
    Plus,
    Phone,
    Mail,
    Award,
    History,
    Loader2,
    ChevronRight,
    Edit2,
    Calendar,
    ShoppingBag,
    RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import '../styles/components/customers.css';
import '../styles/components/common.css';

const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [historyModal, setHistoryModal] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [orderHistory, setOrderHistory] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setCustomers(await response.json());
            }
        } catch (err) {
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length < 2) {
            if (query === '') fetchCustomers();
            return;
        }

        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers/search?query=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setCustomers(await response.json());
            }
        } catch (err) {
            console.error('Search error', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('restroToken');
        const url = selectedCustomer
            ? `${API_BASE_URL}/api/customers/${selectedCustomer.id}`
            : `${API_BASE_URL}/api/customers`;

        try {
            const response = await fetch(url, {
                method: selectedCustomer ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                toast.success(selectedCustomer ? 'Customer updated' : 'Customer created');
                fetchCustomers();
                setIsModalOpen(false);
                setSelectedCustomer(null);
                setFormData({ name: '', phone: '', email: '' });
            } else {
                toast.error(data.error || 'Operation failed');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    const fetchHistory = async (customer) => {
        setHistoryModal(customer);
        setHistoryLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers/${customer.id}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setOrderHistory(await response.json());
            }
        } catch (err) {
            toast.error('Failed to load history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const syncPoints = async (customerId) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/sync-points/${customerId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Points recalculated!');
                fetchCustomers();
            }
        } catch (err) {
            toast.error('Sync failed');
        }
    };

    return (
        <div className="page-container animate-fade">
            <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
                <div className="settings-header" style={{ margin: 0 }}>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Customer Loyalty</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Track guest visits and award loyalty points.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedCustomer(null);
                        setFormData({ name: '', phone: '', email: '' });
                        setIsModalOpen(true);
                    }}
                    className="plan-button plan-button-primary"
                    style={{ padding: '0.85rem 2rem', width: 'auto' }}
                >
                    <Plus size={20} />
                    <span>New Customer</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="ot-search-container" style={{ padding: 0, marginBottom: '2rem' }}>
                <div className="ot-search-wrapper" style={{ height: '56px' }}>
                    <Search className="ot-search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Search customers by name or phone..."
                        className="ot-search-input"
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {/* Customer List */}
            <div className="customer-grid">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="customer-card animate-pulse" style={{ height: '220px', background: 'var(--bg-side)' }}></div>
                    ))
                ) : (
                    customers.map(customer => (
                        <div key={customer.id} className="customer-card animate-fade">
                            <div className="customer-header">
                                <div className="customer-info">
                                    <h3>{customer.name}</h3>
                                    <div className="customer-meta">
                                        <Calendar size={12} />
                                        <span>Joined {new Date(customer.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="points-badge" style={{ position: 'relative' }}>
                                    <Award size={16} />
                                    <span>{customer.points} Pts</span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            syncPoints(customer.id);
                                        }}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            color: 'var(--primary)', 
                                            marginLeft: '6px', 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            opacity: 0.6
                                        }}
                                        title="Recalculate Points"
                                    >
                                        <RotateCcw size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="customer-contact">
                                <div className="contact-item">
                                    <Phone size={14} />
                                    <span>{customer.phone}</span>
                                </div>
                                {customer.email && (
                                    <div className="contact-item">
                                        <Mail size={14} />
                                        <span>{customer.email}</span>
                                    </div>
                                )}
                            </div>

                            <div className="customer-actions">
                                <button
                                    className="action-btn"
                                    onClick={() => fetchHistory(customer)}
                                >
                                    <History size={16} />
                                    History
                                </button>
                                <button
                                    className="action-btn edit"
                                    onClick={() => {
                                        setSelectedCustomer(customer);
                                        setFormData({ name: customer.name, phone: customer.phone, email: customer.email || '' });
                                        setIsModalOpen(true);
                                    }}
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div className="premium-glass animate-fade-in" style={{ width: '400px', padding: '2rem', border: '1px solid var(--glass-border)' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>{selectedCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="input-group">
                                <label>Full Name</label>
                                <input
                                    className="form-input"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="input-group">
                                <label>Phone Number</label>
                                <input
                                    className="form-input"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="e.g. 9841XXXXXX"
                                />
                            </div>
                            <div className="input-group">
                                <label>Email Address (Optional)</label>
                                <input
                                    className="form-input"
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="nav-item active"
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    {selectedCustomer ? 'Save Changes' : 'Register Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div className="premium-glass animate-fade-in" style={{ width: '600px', height: '80vh', padding: '2rem', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Visit History</h2>
                                <p style={{ color: 'var(--text-muted)' }}>{historyModal.name}'s past orders</p>
                            </div>
                            <button
                                onClick={() => setHistoryModal(null)}
                                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}
                            >
                                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {historyLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader2 className="animate-spin" color="var(--primary)" />
                                </div>
                            ) : orderHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                    <ShoppingBag size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                    <p>No transactions found for this customer.</p>
                                </div>
                            ) : (
                                orderHistory.map(order => (
                                    <div key={order.id} className="history-order-card">
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)' }}>Order #{order.id.slice(-6).toUpperCase()}</span>
                                                <span className={`status-badge ${order.status.toLowerCase()}`}>{order.status}</span>
                                            </div>
                                            <div className="customer-meta" style={{ marginBottom: '0.75rem' }}>
                                                <Calendar size={12} />
                                                <span>{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                {order.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', marginLeft: '1.5rem' }}>
                                            <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '4px' }}>{formatCurrency(order.totalAmount)}</div>
                                            <div className="order-points-gain">
                                                <Award size={12} />
                                                <span>+{Math.floor(order.totalAmount / 100)} Points</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagement;
