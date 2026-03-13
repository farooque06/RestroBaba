import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import { Utensils, ShoppingCart, X, Minus, Plus, CheckCircle2, Loader2, UserPlus, Search as SearchIcon, Award, RotateCcw } from 'lucide-react';
import OptimizedImage from './common/OptimizedImage';

const OrderTaking = ({ table, onClose, onOrderPlaced }) => {
    const { user } = useAuth();
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [cart, setCart] = useState([]);
    const [originalQuantities, setOriginalQuantities] = useState({}); // Track what was already ordered
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [existingOrderId, setExistingOrderId] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [quickAddModal, setQuickAddModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
    const [menuSearch, setMenuSearch] = useState('');
    const [clientSettings, setClientSettings] = useState({
        useTax: false,
        taxRate: 0,
        useServiceCharge: false,
        serviceChargeRate: 0
    });

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchMenu(), fetchClientSettings()]);
            if (table.status === 'Occupied') {
                await fetchExistingOrder();
            }
        };
        init();
    }, []);

    const fetchClientSettings = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.user?.client) {
                setClientSettings({
                    useTax: data.user.client.useTax || false,
                    taxRate: data.user.client.taxRate || 0,
                    useServiceCharge: data.user.client.useServiceCharge || false,
                    serviceChargeRate: data.user.client.serviceChargeRate || 0
                });
            }
        } catch (err) {
            console.error('Failed to fetch client settings', err);
        }
    };

    const fetchExistingOrder = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/table/${table.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const order = await response.json();
                if (order && order.items && order.items.length > 0) {
                    setExistingOrderId(order.id);
                    const cartItems = order.items
                        .filter(item => item.status !== 'Waste')
                        .map(item => ({
                            cartKey: `existing-${item.id}`,
                            id: item.menuItem?.id || item.menuItemId,
                            orderItemId: item.id,
                            name: item.menuItem?.name || 'Unknown Item',
                            price: item.price ?? item.menuItem?.price ?? 0,
                            quantity: item.quantity || 1,
                            image: item.menuItem?.image || '',
                            status: item.status,
                            isExisting: true
                        }));

                    // Track original quantities per menuItemId
                    const quantities = {};
                    cartItems.forEach(item => {
                        quantities[item.id] = (quantities[item.id] || 0) + item.quantity;
                    });
                    setOriginalQuantities(quantities);
                    setCart(cartItems);
                }
            }
        } catch (err) {
            console.error('Failed to fetch existing order', err);
        }
    };

    const fetchMenu = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const [itemsRes, catsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/menu/items`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/menu/categories`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            const items = await itemsRes.json();
            const cats = await catsRes.json();

            if (itemsRes.ok) {
                setMenuItems(items.filter(item => item.available));
                setCategories(['All', ...cats.map(c => c.name)]);
            }
        } catch (err) {
            console.error('Failed to fetch menu', err);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item) => {
        // Always add new items as separate cart entries
        const existingNew = cart.find(i => i.id === item.id && !i.isExisting);
        if (existingNew) {
            setCart(cart.map(i => i.cartKey === existingNew.cartKey ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { ...item, cartKey: `new-${item.id}-${Date.now()}`, quantity: 1, isExisting: false }]);
        }
    };

    const removeFromCart = (cartKey) => {
        const existing = cart.find(i => i.cartKey === cartKey);
        if (!existing) return;
        // Don't allow removing existing order items
        if (existing.isExisting) {
            toast.error('Cannot remove already-ordered items from here');
            return;
        }
        if (existing.quantity > 1) {
            setCart(cart.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i));
        } else {
            setCart(cart.filter(i => i.cartKey !== cartKey));
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = clientSettings.useTax ? (subtotal * (clientSettings.taxRate / 100)) : 0;
    const serviceChargeAmount = clientSettings.useServiceCharge ? (subtotal * (clientSettings.serviceChargeRate / 100)) : 0;
    const finalTotal = subtotal + taxAmount + serviceChargeAmount;

    const handleCustomerSearch = async (query) => {
        setCustomerSearch(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers/search?query=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setSearchResults(await response.json());
        } catch (err) {
            console.error('Customer search error', err);
        }
    };

    const handleQuickAdd = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newCustomer)
            });
            const data = await response.json();
            if (response.ok) {
                setSelectedCustomer(data);
                setQuickAddModal(false);
                setShowCustomerSearch(false);
                toast.success('Customer registered and selected');
            } else {
                toast.error(data.error);
            }
        } catch (err) {
            toast.error('Failed to register customer');
        }
    };

    const handleRemake = async (orderItemId) => {
        if (!window.confirm('Mark this item as Spillage/Waste and order a fresh one?')) return;

        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/item/${orderItemId}/remake`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success('Remake triggered! Sent to kitchen.');
                fetchExistingOrder(); // Refresh the order items
            } else {
                toast.error('Failed to trigger remake');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;
        setSubmitting(true);
        const token = localStorage.getItem('restroToken');

        // Only send items that are NEW (not existing order items)
        const newItems = cart
            .filter(item => !item.isExisting)
            .map(item => ({
                menuItemId: item.id,
                quantity: item.quantity,
                price: item.price,
                notes: item.notes
            }));

        if (existingOrderId && newItems.length === 0) {
            toast.error('No new items added to order');
            setSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    tableId: table.id,
                    totalAmount: finalTotal,
                    customerId: selectedCustomer?.id,
                    items: existingOrderId ? newItems : cart.map(item => ({
                        menuItemId: item.id,
                        quantity: item.quantity,
                        price: item.price,
                        notes: item.notes
                    }))
                })
            });

            if (response.ok) {
                toast.success('Order placed successfully!');
                onOrderPlaced();
                onClose();
            } else {
                toast.error('Failed to place order');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category.name === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', zIndex: 2000 }}>
            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Utensils color="var(--primary)" />
                            Table {table.number} - {existingOrderId ? 'Current Order' : 'New Order'}
                        </h2>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                        <SearchIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search dishes..."
                            value={menuSearch}
                            onChange={(e) => setMenuSearch(e.target.value)}
                            className="auth-input"
                            style={{ paddingLeft: '2.5rem', marginBottom: 0, width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '12px',
                                    background: selectedCategory === cat ? 'var(--primary)' : 'var(--glass-shine)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {filteredItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className="premium-glass"
                            style={{
                                padding: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <OptimizedImage
                                src={item.image}
                                alt={item.name}
                                style={{ width: '100%', height: '110px', borderRadius: '10px', marginBottom: '0.75rem' }}
                            />
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', lineHeight: 1.2 }}>{item.name}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ color: 'var(--primary)', fontWeight: 800 }}>{formatCurrency(item.price)}</p>
                                    {item.recipe && item.recipe.length > 0 && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            color: item.recipe[0].inventoryItem.quantity > 5 ? 'var(--success)' : 'var(--danger)',
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                        }}>
                                            {item.recipe[0].inventoryItem.quantity} {item.recipe[0].inventoryItem.unit}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="premium-glass" style={{ width: '380px', height: '100%', borderLeft: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ShoppingCart color="var(--primary)" />
                        <h3 style={{ fontSize: '1.25rem' }}>Your Basket</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Customer Selection */}
                <div className="premium-glass" style={{ padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
                    {!selectedCustomer ? (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                                style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--glass-border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                            >
                                <UserPlus size={16} />
                                Link Customer (Loyalty)
                            </button>

                            {showCustomerSearch && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1c', border: '1px solid #333', borderRadius: '8px', marginTop: '4px', zIndex: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                    <div style={{ padding: '0.5rem', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <SearchIcon size={14} color="#555" />
                                        <input
                                            autoFocus
                                            placeholder="Search name or phone..."
                                            value={customerSearch}
                                            onChange={(e) => handleCustomerSearch(e.target.value)}
                                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                        {searchResults.map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); }}
                                                style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #222', fontSize: '0.85rem' }}
                                                className="hover-bg"
                                            >
                                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#777' }}>{c.phone} ┬╖ {c.points} Pts</div>
                                            </div>
                                        ))}
                                        {customerSearch.length > 2 && searchResults.length === 0 && (
                                            <div
                                                onClick={() => setQuickAddModal(true)}
                                                style={{ padding: '1rem', textAlign: 'center', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                                            >
                                                + Register "{customerSearch}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Award size={16} color="white" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{selectedCustomer.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#ffd700', fontWeight: 700 }}>{selectedCustomer.points} Loyalty Points</div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}>
                                <X size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {cart.map(item => (
                        <div key={item.cartKey || item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: item.isExisting ? 0.7 : 1 }}>
                            <div>
                                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                    {item.name}
                                    {item.isExisting && (
                                        <span style={{ fontSize: '0.65rem', marginLeft: '6px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                            {item.status || 'Ordered'}
                                        </span>
                                    )}
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatCurrency(item.price)} each</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {item.orderItemId && (
                                    <button
                                        onClick={() => handleRemake(item.orderItemId)}
                                        className="premium-glass"
                                        style={{ padding: '6px', borderRadius: '8px', color: 'var(--danger)' }}
                                        title="Spilled / Remake (Log as Waste)"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                )}
                                {!item.isExisting && (
                                    <>
                                        <button onClick={() => removeFromCart(item.cartKey)} className="premium-glass" style={{ padding: '4px', borderRadius: '6px' }}><Minus size={14} /></button>
                                        <span style={{ fontWeight: 700 }}>{item.quantity}</span>
                                        <button onClick={() => addToCart(item)} className="premium-glass" style={{ padding: '4px', borderRadius: '6px' }}><Plus size={14} /></button>
                                    </>
                                )}
                                {item.isExisting && (
                                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>├ù{item.quantity}</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
                            <Utensils size={40} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                            <p>Basket is empty</p>
                        </div>
                    )}
                </div>

                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subtotal</span>
                        <span style={{ fontSize: '0.85rem' }}>{formatCurrency(subtotal)}</span>
                    </div>

                    {clientSettings.useTax && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>VAT ({clientSettings.taxRate}%)</span>
                            <span style={{ fontSize: '0.85rem' }}>{formatCurrency(taxAmount)}</span>
                        </div>
                    )}

                    {clientSettings.useServiceCharge && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Service Charge ({clientSettings.serviceChargeRate}%)</span>
                            <span style={{ fontSize: '0.85rem' }}>{formatCurrency(serviceChargeAmount)}</span>
                        </div>
                    )}

                    {selectedCustomer && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: '#ffd700', fontSize: '0.8rem', fontWeight: 600 }}>
                            <span>Points to Earn</span>
                            <span>+{Math.floor(finalTotal / 100)} Pts</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', marginBottom: '1.5rem', borderTop: '1px dashed var(--glass-border)', paddingTop: '0.75rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total Payable</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(finalTotal)}</span>
                    </div>
                    <button
                        onClick={handleSubmitOrder}
                        disabled={cart.length === 0 || submitting}
                        className="nav-item active"
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: cart.length === 0 ? 0.5 : 1 }}
                    >
                        {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                        Confirm Order
                    </button>
                </div>

                {/* Quick Add Customer Modal */}
                {quickAddModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
                        <div className="premium-glass animate-fade-in" style={{ width: '320px', padding: '2rem', border: '1px solid var(--glass-border)' }}>
                            <h3 style={{ marginBottom: '1.5rem' }}>Register Customer</h3>
                            <form onSubmit={handleQuickAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <input
                                    className="auth-input"
                                    placeholder="Customer Name"
                                    required
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                />
                                <input
                                    className="auth-input"
                                    placeholder="Phone Number"
                                    required
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setQuickAddModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'transparent', border: '1px solid #333', color: 'white', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" className="nav-item active" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Register</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderTaking;
