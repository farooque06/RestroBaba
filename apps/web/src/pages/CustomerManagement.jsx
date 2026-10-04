import React, { useState, useEffect, useRef } from 'react';
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
    Edit2,
    Calendar,
    ShoppingBag,
    CircleDollarSign,
    RotateCcw,
    AlertCircle,
    UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import '../styles/components/customers.css';
import '../styles/components/common.css';

const getCustomerTier = (lifetimeSpend) => {
    if (lifetimeSpend >= 15000) return 'vip';
    if (lifetimeSpend >= 5000) return 'gold';
    return 'silver';
};

const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState('all');
    const [customerSort, setCustomerSort] = useState('spend');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [historyModal, setHistoryModal] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [orderHistory, setOrderHistory] = useState([]);
    const [customersError, setCustomersError] = useState('');
    const [syncingCustomerId, setSyncingCustomerId] = useState(null);
    const customerRequestId = useRef(0);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        fetchCustomers(searchQuery);
    }, []);

    const fetchCustomers = async (query = '') => {
        const requestId = ++customerRequestId.current;
        if (customers.length === 0) setLoading(true);
        setCustomersError('');
        const token = localStorage.getItem('restroToken');
        try {
            const endpoint = query.trim()
                ? `${API_BASE_URL}/api/customers/search?${new URLSearchParams({ query: query.trim() })}`
                : `${API_BASE_URL}/api/customers`;
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load customers');
            if (!Array.isArray(data)) throw new Error('Unexpected customer list response');
            if (requestId !== customerRequestId.current) return;
            setCustomers(data.map(customer => ({
                ...customer,
                points: Number(customer.points ?? 0),
                visitCount: Number(customer.visitCount ?? 0),
                lifetimeSpend: Number(customer.lifetimeSpend ?? 0)
            })));
        } catch (err) {
            if (requestId === customerRequestId.current) {
                const message = err instanceof Error ? err.message : 'Failed to load customers';
                setCustomersError(message);
                toast.error(message);
            }
        } finally {
            if (requestId === customerRequestId.current) setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        const requestId = ++customerRequestId.current;
        if (!query.trim()) {
            fetchCustomers();
            return;
        }

        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers/search?${new URLSearchParams({ query })}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Customer search failed');
            if (!Array.isArray(data)) throw new Error('Unexpected customer search response');
            if (requestId === customerRequestId.current) {
                setCustomers(data.map(customer => ({
                    ...customer,
                    points: Number(customer.points ?? 0),
                    visitCount: Number(customer.visitCount ?? 0),
                    lifetimeSpend: Number(customer.lifetimeSpend ?? 0)
                })));
                setCustomersError('');
            }
        } catch (err) {
            if (requestId === customerRequestId.current) {
                const message = err instanceof Error ? err.message : 'Customer search failed';
                setCustomersError(message);
                toast.error(message);
            }
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
                fetchCustomers(searchQuery);
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
        setSyncingCustomerId(customerId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/sync-points/${customerId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to recalculate points');
            setCustomers(current => current.map(customer =>
                customer.id === customerId ? { ...customer, points: Number(data.points ?? 0) } : customer
            ));
            toast.success(`Points updated: ${Number(data.points ?? 0).toLocaleString()} points`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to recalculate points');
        } finally {
            setSyncingCustomerId(null);
        }
    };

    const visibleCustomers = customers
        .filter(customer => tierFilter === 'all' || getCustomerTier(customer.lifetimeSpend) === tierFilter)
        .sort((left, right) => {
            let difference = 0;
            if (customerSort === 'visits') {
                difference = right.visitCount - left.visitCount;
            } else if (customerSort === 'lastVisit') {
                difference = new Date(right.lastVisit || 0).getTime() - new Date(left.lastVisit || 0).getTime();
            } else {
                difference = right.lifetimeSpend - left.lifetimeSpend;
            }
            return difference || left.name.localeCompare(right.name);
        });

    return (
        <div className="page-container animate-fade customer-page">
            <div className="page-header">
                <div className="page-header-info">
                    <div className="customer-staff-title">
                        <h1>Customer Loyalty</h1>
                        <div className="status-badge active">
                            <Users size={13} />
                            {customers.length} Customers
                        </div>
                    </div>
                    <p className="customer-staff-subtitle">Track guest visits and award loyalty points on paid orders.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedCustomer(null);
                        setFormData({ name: '', phone: '', email: '' });
                        setIsModalOpen(true);
                    }}
                    className="btn-primary"
                >
                    <Plus size={20} />
                    <span>New Customer</span>
                </button>
            </div>

            <div className="customer-toolbar customer-staff-toolbar">
                <div className="customer-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search customers by name or phone..."
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                </div>
                <div className="customer-toolbar-controls">
                    <label className="customer-filter-control">
                        <span>Tier</span>
                        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
                            <option value="all">All tiers</option>
                            <option value="silver">Silver</option>
                            <option value="gold">Gold</option>
                            <option value="vip">VIP</option>
                        </select>
                    </label>
                    <label className="customer-filter-control">
                        <span>Sort by</span>
                        <select value={customerSort} onChange={e => setCustomerSort(e.target.value)}>
                            <option value="spend">Highest spend</option>
                            <option value="visits">Most visits</option>
                            <option value="lastVisit">Recent visit</option>
                        </select>
                    </label>
                </div>
                <span className="customer-toolbar-hint">
                    {searchQuery ? `${visibleCustomers.length} of ${customers.length} matches` : `${visibleCustomers.length} customers`}
                </span>
            </div>

            <div className="customer-grid">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="customer-card customer-skeleton" />
                    ))
                ) : (
                    visibleCustomers.map((customer, index) => (
                        <article key={customer.id} className="stat-card customer-staff-card animate-fade" style={{ animationDelay: `${index * 35}ms` }}>
                            <div className="customer-staff-card-header">
                                <div className="customer-staff-identity">
                                    <div className="customer-avatar">
                                        {(customer.name || 'G').trim().split(/\s+/).map(part => part[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div className="customer-staff-name">
                                        <div className="customer-staff-name-row">
                                            <h3>{customer.name}</h3>
                                            <span className={`customer-tier-badge ${getCustomerTier(customer.lifetimeSpend)}`}>
                                                {getCustomerTier(customer.lifetimeSpend)}
                                            </span>
                                        </div>
                                        <span className="customer-staff-joined"><Calendar size={12} /> Joined {new Date(customer.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="customer-points-panel">
                                    <span className="customer-points-label"><Award size={13} /> Loyalty points</span>
                                    <strong>{Number(customer.points || 0).toLocaleString()}</strong>
                                    <button
                                        type="button"
                                        className="points-sync-button"
                                        disabled={syncingCustomerId === customer.id}
                                        onClick={() => syncPoints(customer.id)}
                                        title="Recalculate points from paid orders"
                                        aria-label={`Recalculate points for ${customer.name}`}
                                    >
                                        <RotateCcw size={13} className={syncingCustomerId === customer.id ? 'customer-spin' : ''} />
                                    </button>
                                </div>
                            </div>

                            <div className="customer-staff-details">
                                <div className="customer-staff-detail">
                                    <Phone size={14} />
                                    <span>{customer.phone}</span>
                                </div>
                                <div className="customer-staff-detail">
                                    <Mail size={14} />
                                    <span>{customer.email || 'No email address'}</span>
                                </div>
                            </div>

                            <div className="customer-insights" aria-label="Customer insights">
                                <div className="customer-insight">
                                    <ShoppingBag size={14} />
                                    <span><strong>{customer.visitCount}</strong> visits</span>
                                </div>
                                <div className="customer-insight">
                                    <CircleDollarSign size={14} />
                                    <span><strong>{formatCurrency(customer.lifetimeSpend)}</strong> spent</span>
                                </div>
                                <div className="customer-insight">
                                    <Calendar size={14} />
                                    <span><strong>{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : '—'}</strong> last visit</span>
                                </div>
                            </div>

                            <div className="customer-actions customer-staff-actions">
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
                        </article>
                    ))
                )}
                {!loading && customersError && (
                    <div className="customer-empty-state customer-error-state" role="alert">
                        <AlertCircle size={26} />
                        <h3>Could not load customers</h3>
                        <p>{customersError}</p>
                        <button type="button" className="customer-empty-action" onClick={() => fetchCustomers(searchQuery)}>
                            Try again
                        </button>
                    </div>
                )}
                {!loading && !customersError && visibleCustomers.length === 0 && customers.length > 0 && (
                    <div className="customer-empty-state">
                        <UserRound size={28} />
                        <h3>No customers match these filters</h3>
                        <p>Try another VIP tier or clear the search.</p>
                        <button
                            type="button"
                            className="customer-empty-action"
                            onClick={() => {
                                setTierFilter('all');
                                setSearchQuery('');
                                fetchCustomers();
                            }}
                        >
                            Clear filters
                        </button>
                    </div>
                )}
                {!loading && !customersError && customers.length === 0 && (
                    <div className="customer-empty-state">
                        <UserRound size={28} />
                        <h3>{searchQuery ? 'No customers match your search' : 'No customers yet'}</h3>
                        <p>{searchQuery ? 'Try another name or phone number.' : 'Add your first customer to start tracking visits and loyalty points.'}</p>
                        {!searchQuery && (
                            <button type="button" className="customer-empty-action" onClick={() => { setSelectedCustomer(null); setFormData({ name: '', phone: '', email: '' }); setIsModalOpen(true); }}>
                                <Plus size={16} /> Add first customer
                            </button>
                        )}
                    </div>
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
                                            {order.status === 'Paid' && (
                                                <div className="order-points-gain">
                                                    <Award size={12} />
                                                    <span>+{Math.floor(order.totalAmount / 100)} Points</span>
                                                </div>
                                            )}
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
