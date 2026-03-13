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
    ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';

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

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Customer Loyalty</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Track guest visits and award loyalty points.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedCustomer(null);
                        setFormData({ name: '', phone: '', email: '' });
                        setIsModalOpen(true);
                    }}
                    className="nav-item active"
                    style={{ border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
                >
                    <Plus size={20} />
                    <span>New Customer</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="search-bar">
                <Search size={18} />
                <input
                    type="text"
                    placeholder="Search customers by name or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Customer List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="stat-card animate-pulse" style={{ height: '180px' }}></div>
                    ))
                ) : (
                    customers.map(customer => (
                        <div key={customer.id} className="stat-card premium-glass" style={{ padding: '1.5rem', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{customer.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        <Phone size={12} />
                                        <span>{customer.phone}</span>
                                    </div>
                                </div>
                                <div style={{
                                    background: 'rgba(255, 215, 0, 0.1)',
                                    color: '#ffd700',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: '1px solid rgba(255, 215, 0, 0.2)'
                                }}>
                                    <Award size={14} />
                                    <span>{customer.points} Pts</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                {customer.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        <Mail size={12} />
                                        <span>{customer.email}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <Calendar size={12} />
                                    <span>Joined {new Date(customer.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                                <button
                                    onClick={() => fetchHistory(customer)}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', borderRadius: '8px', background: 'var(--glass-shine)', border: '1px solid var(--glass-border)', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}
                                >
                                    <History size={14} />
                                    History
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedCustomer(customer);
                                        setFormData({ name: customer.name, phone: customer.phone, email: customer.email || '' });
                                        setIsModalOpen(true);
                                    }}
                                    style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--glass-shine)', border: '1px solid var(--glass-border)', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}
                                >
                                    <Edit2 size={14} />
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
                                <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>
                                    <ShoppingBag size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                    <p>No transactions found for this customer.</p>
                                </div>
                            ) : (
                                orderHistory.map(order => (
                                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: 700 }}>Order #{order.id.slice(-6).toUpperCase()}</span>
                                                <span className="badge" style={{ fontSize: '0.65rem' }}>{order.status}</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#555' }}>
                                                {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                                {order.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>{formatCurrency(order.totalAmount)}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#ffd700', fontWeight: 600 }}>+{Math.floor(order.totalAmount / 100)} Points</div>
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
