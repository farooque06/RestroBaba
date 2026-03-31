import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import {
    Utensils, ShoppingCart, X, Minus, Plus, CheckCircle2, Loader2,
    UserPlus, Search as SearchIcon, Award, RotateCcw, ChevronUp, ChevronDown, Heart
} from 'lucide-react';
import OptimizedImage from './common/OptimizedImage';

const OrderTaking = ({ table, onClose, onOrderPlaced }) => {
    const { user } = useAuth();
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [cart, setCart] = useState([]);
    const [originalQuantities, setOriginalQuantities] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [existingOrderId, setExistingOrderId] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [quickAddModal, setQuickAddModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
    const [variantModalItem, setVariantModalItem] = useState(null); // Tracks which item is being selected for variants
    const [menuSearch, setMenuSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(12);
    const [showCart, setShowCart] = useState(false);
    const [clientSettings, setClientSettings] = useState({
        useTax: false, taxRate: 0,
        useServiceCharge: false, serviceChargeRate: 0
    });

    const observerLoader = useRef(null);
    const categoryScrollRef = useRef(null);

    // ─── CART CALCULATIONS ──────────────────────────────────────────
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = clientSettings.useTax ? (subtotal * (clientSettings.taxRate / 100)) : 0;
    const serviceChargeAmount = clientSettings.useServiceCharge ? (subtotal * (clientSettings.serviceChargeRate / 100)) : 0;
    const finalTotal = subtotal + taxAmount + serviceChargeAmount;
    const newItemCount = cart.filter(i => !i.isExisting).reduce((sum, i) => sum + i.quantity, 0);

    // ─── INITIALIZATION ──────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchMenu(), fetchClientSettings()]);
            if (table.status === 'Occupied') {
                await fetchExistingOrder();
            }
        };
        init();
    }, []);

    // ─── SEARCH & SCROLL LOGIC ────────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(menuSearch);
            setVisibleCount(12); // Reset count on new search
        }, 300);
        return () => clearTimeout(timer);
    }, [menuSearch]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && visibleCount < menuItems.length) {
                setVisibleCount(prev => prev + 12);
            }
        }, { threshold: 0.1 });

        if (observerLoader.current) {
            observer.observe(observerLoader.current);
        }

        return () => observer.disconnect();
    }, [visibleCount, menuItems.length]);

    // ─── DATA FETCHING ──────────────────────────────────────────────
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
                            variantName: item.variant?.name || null, // ADDED
                            price: item.price ?? item.menuItem?.price ?? 0,
                            quantity: item.quantity || 1,
                            image: item.menuItem?.image || '',
                            status: item.status,
                            isExisting: true
                        }));

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

    // ─── CART ACTIONS ───────────────────────────────────────────────
    const addToCart = (item, variant = null) => {
        // If item has variants and none was selected yet, open modal
        if (item.variants && item.variants.length > 0 && !variant) {
            setVariantModalItem(item);
            return;
        }

        const price = variant ? parseFloat(variant.price) : parseFloat(item.price);
        const variantId = variant ? variant.id : null;
        const variantName = variant ? variant.name : null;
        const cartKey = `new-${item.id}-${variantId || 'base'}`;

        const existingNew = cart.find(i => i.cartKey === cartKey && !i.isExisting);
        
        if (existingNew) {
            setCart(cart.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { 
                ...item, 
                cartKey, 
                variantId, 
                variantName, 
                price, // Use variant price
                quantity: 1, 
                isExisting: false 
            }]);
        }
        
        setVariantModalItem(null);
        toast.success(`Added ${item.name}${variantName ? ` (${variantName})` : ''}`, { icon: '🍽️', position: 'bottom-center' });
    };

    const removeFromCart = (cartKey) => {
        const existing = cart.find(i => i.cartKey === cartKey);
        if (!existing || existing.isExisting) return;

        if (existing.quantity > 1) {
            setCart(cart.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i));
        } else {
            setCart(cart.filter(i => i.cartKey !== cartKey));
        }
    };

    // ─── CUSTOMER ACTIONS ───────────────────────────────────────────
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
        setSubmitting(true);
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
                toast.success('Customer registered');
            } else {
                toast.error(data.error || 'Failed to add customer');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitting(false);
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
                fetchExistingOrder(); 
            } else {
                toast.error('Failed to trigger remake');
            }
        } catch (err) {
            toast.error('Connection error');
        }
    };

    // ─── ORDER SUBMISSION ───────────────────────────────────────────
    const handleSubmitOrder = async () => {
        const newItems = cart.filter(item => !item.isExisting);
        if (newItems.length === 0) {
            toast.error('No new items to send');
            return;
        }
        
        setSubmitting(true);
        const token = localStorage.getItem('restroToken');

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
                    items: newItems.map(item => ({
                        menuItemId: item.id,
                        variantId: item.variantId, // NEW
                        quantity: item.quantity,
                        price: item.price
                    }))
                })
            });

            if (response.ok) {
                toast.success('Sent to kitchen!', { duration: 3000 });
                onOrderPlaced();
                onClose();
            } else {
                const err = await response.json();
                toast.error(err.error || 'Failed to place order');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                <Loader2 className="animate-spin text-amber-500" size={64} />
            </div>
        );
    }

    return createPortal(
        <div className="ot-overlay">
            {/* HEADER */}
            <header className="ot-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="ot-table-badge">
                        <Utensils size={16} />
                        <span>Table {table.number}</span>
                    </div>
                </div>
                <div className="ot-header-actions">
                    <button onClick={onClose} className="ot-close-btn">
                        <X size={24} />
                    </button>
                </div>
            </header>

            <div className="ot-main-layout">
                {/* MENU SECTION */}
                <div className="ot-menu-section">
                    {/* Search */}
                    <div className="ot-search-container">
                        <div className="ot-search-wrapper">
                            <SearchIcon className="ot-search-icon" size={18} />
                            <input
                                type="text"
                                placeholder="Find items..."
                                className="ot-search-input"
                                value={menuSearch}
                                onChange={e => setMenuSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="ot-category-bar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`ot-category-pill ${selectedCategory === cat ? 'active' : ''}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Menu Area */}
                    <div className="ot-scroll-area">
                        <div className="ot-menu-grid">
                            {menuItems
                                .filter(item => {
                                    const catMatch = selectedCategory === 'All' || item.category.name === selectedCategory;
                                    const searchMatch = item.name.toLowerCase().includes(debouncedSearch.toLowerCase());
                                    return catMatch && searchMatch;
                                })
                                .slice(0, visibleCount)
                                .map(item => {
                                    const inCart = cart.find(c => c.id === item.id && !c.isExisting);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => addToCart(item)}
                                            className="ot-item-card"
                                        >
                                            <div className="ot-item-image-wrapper">
                                                <OptimizedImage
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="ot-item-image"
                                                />
                                                {inCart && (
                                                    <div className="ot-qty-badge">
                                                        {inCart.quantity}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ot-item-info">
                                                <h3 className="ot-item-name">{item.name}</h3>
                                                <div className="ot-item-price-row">
                                                    <span className="ot-item-price">{formatCurrency(item.price)}</span>
                                                    <div className="ot-add-btn">
                                                        <Plus size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Infinite Scroll trigger */}
                        <div ref={observerLoader} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' }}>
                            {visibleCount < menuItems.length && <Loader2 className="animate-spin text-amber-500" size={24} />}
                        </div>
                    </div>
                </div>

                {/* SIDE BASKET (Desktop) / BOTTOM SHEET (Mobile) */}
                <div className={`ot-side-basket ${showCart ? 'mobile-show' : ''}`}>
                    <div className="ot-basket-content">
                        <div className="ot-basket-header">
                            <h3>Current Order</h3>
                            <button className="ot-mobile-only" onClick={() => setShowCart(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Customer Section */}
                        {selectedCustomer ? (
                            <div className="ot-customer-card">
                                <div>
                                    <p style={{ fontWeight: 800 }}>{selectedCustomer.name}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{selectedCustomer.points} Points Available</p>
                                </div>
                                <X size={20} onClick={() => setSelectedCustomer(null)} style={{ cursor: 'pointer', opacity: 0.6 }} />
                            </div>
                        ) : (
                            <button onClick={() => setShowCustomerSearch(true)} className="ot-customer-btn">
                                <UserPlus size={18} />
                                <span>Add Guest Info</span>
                            </button>
                        )}

                        {/* Items List */}
                        <div className="ot-basket-items">
                            {cart.length === 0 ? (
                                <div className="ot-empty-basket">
                                    <ShoppingCart size={48} strokeWidth={1} />
                                    <p>Your basket is empty</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.cartKey || item.id} className="ot-basket-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="qty" style={{ 
                                                width: '28px', 
                                                height: '28px', 
                                                background: 'var(--primary-glow)', 
                                                color: 'var(--primary)', 
                                                borderRadius: '8px', 
                                                fontSize: '0.8rem', 
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1px solid rgba(212, 175, 55, 0.2)'
                                            }}>
                                                {item.quantity}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px', color: 'var(--text-heading)' }}>
                                                    {item.name}
                                                    {item.variantName && (
                                                        <span style={{ 
                                                            marginLeft: '0.5rem', 
                                                            color: 'var(--primary)', 
                                                            fontWeight: 600,
                                                            fontSize: '0.85rem'
                                                        }}>
                                                            ({item.variantName})
                                                        </span>
                                                    )}
                                                    {item.isExisting && (
                                                        <span style={{ 
                                                            marginLeft: '0.6rem', 
                                                            fontSize: '0.6rem', 
                                                            padding: '2px 6px', 
                                                            background: 'rgba(255,255,255,0.05)', 
                                                            color: 'var(--text-muted)',
                                                            borderRadius: '4px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.02em'
                                                        }}>
                                                            {item.status}
                                                        </span>
                                                    )}
                                                </p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{formatCurrency(item.price)}</p>
                                            </div>
                                        </div>
                                        <div className="ot-qty-controls">
                                            {!item.isExisting ? (
                                                <>
                                                    <button onClick={() => removeFromCart(item.cartKey)} className="ot-qty-btn">
                                                        <Minus size={14} />
                                                    </button>
                                                    <button onClick={() => addToCart(item)} className="ot-qty-btn">
                                                        <Plus size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleRemake(item.orderItemId)} className="ot-qty-btn remake" title="Remake / Waste">
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Totals & Confirm */}
                        <div className="ot-basket-footer">
                            <div className="ot-totals">
                                <div className="ot-total-line">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="ot-total-line grand">
                                    <span>Grand Total</span>
                                    <span>{formatCurrency(finalTotal)}</span>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleSubmitOrder}
                                disabled={newItemCount === 0 || submitting}
                                className="ot-confirm-btn"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                <span>{existingOrderId ? 'Update Order' : 'Confirm Order'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE QUICK BASKET BAR */}
            <div className="ot-basket-bar">
                <div className="ot-basket-left" onClick={() => setShowCart(true)}>
                    <div className="ot-basket-icon-wrapper">
                        <ShoppingCart size={24} />
                        {cart.length > 0 && <span className="ot-basket-count">{cart.length}</span>}
                    </div>
                    <div className="ot-basket-summary">
                        <span className="ot-basket-label">{newItemCount} New Items</span>
                        <span className="ot-basket-total">{formatCurrency(finalTotal)}</span>
                    </div>
                    <ChevronUp size={20} />
                </div>
                <button
                    onClick={handleSubmitOrder}
                    disabled={newItemCount === 0 || submitting}
                    className="ot-confirm-btn-mobile"
                >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                </button>
            </div>


            {/* CUSTOMER SEARCH OVERLAY (Now single modal for search & reg) */}
            {showCustomerSearch && (
                <div className="ot-customer-overlay" onClick={(e) => e.target === e.currentTarget && setShowCustomerSearch(false)}>
                    <div className="ol-payment-sheet" style={{ maxWidth: '440px', borderRadius: 'var(--radius-xl)', minHeight: quickAddModal ? 'auto' : '60vh' }}>
                        
                        {/* HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                                {quickAddModal ? 'New Guest Registration' : 'Guest Loyalty'}
                            </h2>
                            <button 
                                onClick={() => { setShowCustomerSearch(false); setQuickAddModal(false); }} 
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {quickAddModal ? (
                            /* REGISTRATION FORM */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="ot-search-wrapper" style={{ boxShadow: 'none' }}>
                                    <input
                                        className="ot-search-input"
                                        placeholder="Full Name"
                                        value={newCustomer.name}
                                        onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                        style={{ paddingLeft: '1.25rem' }}
                                    />
                                </div>
                                <div className="ot-search-wrapper" style={{ boxShadow: 'none' }}>
                                    <input
                                        className="ot-search-input"
                                        placeholder="Phone Number"
                                        value={newCustomer.phone}
                                        onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                        style={{ paddingLeft: '1.25rem' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                    <button 
                                        onClick={() => setQuickAddModal(false)} 
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-heading)', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Back to Search
                                    </button>
                                    <button 
                                        onClick={handleQuickAdd} 
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Register & Select
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* SEARCH VIEW */
                            <>
                                <div className="ot-search-wrapper" style={{ marginBottom: '1.5rem' }}>
                                    <SearchIcon className="ot-search-icon" size={18} />
                                    <input
                                        autoFocus
                                        className="ot-search-input"
                                        placeholder="Search by name or phone..."
                                        value={customerSearch}
                                        onChange={(e) => handleCustomerSearch(e.target.value)}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {searchResults.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); }}
                                            className="tm-card"
                                            style={{ padding: '1rem', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-input)' }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <p style={{ fontWeight: 700, margin: 0 }}>{c.name}</p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{c.phone}</p>
                                                </div>
                                                <div style={{ background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {c.points} Pts
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(customerSearch.length > 2 || searchResults.length === 0) && (
                                        <button 
                                            onClick={() => {
                                                setQuickAddModal(true);
                                                // Pre-fill name or phone if it looks like one
                                                const looksLikePhone = /^[0-9+]+$/.test(customerSearch);
                                                setNewCustomer({
                                                    name: looksLikePhone ? '' : customerSearch,
                                                    phone: looksLikePhone ? customerSearch : ''
                                                });
                                            }} 
                                            className="ot-customer-btn" 
                                            style={{ borderStyle: 'dashed', marginTop: '0.5rem' }}
                                        >
                                            <UserPlus size={18} />
                                            <span>
                                                {searchResults.length === 0 && customerSearch.length > 0 
                                                  ? `No guest found. Register "${customerSearch}"?`
                                                  : 'Register New Guest'}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* VARIANT SELECTION MODAL */}
            {variantModalItem && (
                <div className="ot-customer-overlay" onClick={() => setVariantModalItem(null)}>
                    <div className="premium-glass animate-pop" style={{ width: '90%', maxWidth: '400px', padding: '2rem', borderRadius: '24px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Select Option</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{variantModalItem.name}</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {variantModalItem.variants.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => addToCart(variantModalItem, v)}
                                    className="tm-card"
                                    style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        padding: '1.25rem', 
                                        border: '1px solid var(--border)',
                                        background: 'var(--glass-shine)',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                >
                                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{v.name}</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{formatCurrency(v.price)}</span>
                                </button>
                            ))}
                        </div>
                        
                        <button 
                            onClick={() => setVariantModalItem(null)}
                            style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', background: 'none', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default OrderTaking;