import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, UserPlus, X, Loader2, Award } from 'lucide-react';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';
import '../styles/components/customer-selection.css';

const CustomerSelectionModal = ({ onClose, onSelect, orderId = null, initialSearch = '' }) => {
    const [search, setSearch] = useState(initialSearch);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [newGuest, setNewGuest] = useState({ name: '', phone: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (initialSearch) {
            handleSearch(initialSearch);
        }
    }, [initialSearch]);

    const handleSearch = async (query) => {
        setSearch(query);
        if (query.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers/search?query=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setResults(await response.json());
            }
        } catch (err) {
            console.error('Customer search error', err);
        } finally {
            setLoading(false);
        }
    };

    const linkToOrder = async (customerId) => {
        if (!orderId) return true;

        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/customer`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customerId })
            });
            if (response.ok) {
                return true;
            }
            toast.error('Failed to update order');
            return false;
        } catch (err) {
            toast.error('Connection error');
            return false;
        }
    };

    const handleSelection = async (customer) => {
        const success = await linkToOrder(customer.id);
        if (success) {
            onSelect(customer);
            onClose();
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!newGuest.name || !newGuest.phone) {
            toast.error('Both name and phone are required');
            return;
        }

        setSubmitting(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newGuest)
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('Guest registered!');
                await handleSelection(data);
            } else {
                toast.error(data.error || 'Registration failed');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="ot-customer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="selection-modal-container animate-pop">
                
                {/* HEADER */}
                <div className="selection-modal-header">
                    <h2>
                        {isRegisterMode ? 'New Guest Registration' : 'Guest Identification'}
                    </h2>
                    <button onClick={onClose} className="modal-close-btn">
                        <X size={24} />
                    </button>
                </div>

                {isRegisterMode ? (
                    /* REGISTRATION FORM */
                    <form onSubmit={handleRegister} className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name</label>
                            <input
                                autoFocus
                                className="form-input"
                                placeholder="Enter guest name..."
                                value={newGuest.name}
                                onChange={e => setNewGuest({ ...newGuest, name: e.target.value })}
                                style={{ padding: '0.85rem 1.15rem', background: 'var(--bg-side)', border: '1px solid var(--border)', borderRadius: '12px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone Number</label>
                            <input
                                className="form-input"
                                type="tel"
                                placeholder="98XXXXXXXX"
                                value={newGuest.phone}
                                onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })}
                                style={{ padding: '0.85rem 1.15rem', background: 'var(--bg-side)', border: '1px solid var(--border)', borderRadius: '12px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button 
                                type="button"
                                onClick={() => setIsRegisterMode(false)} 
                                style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-heading)', fontWeight: 700 }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={submitting}
                                className="nav-item active"
                                style={{ flex: 2, padding: '0.85rem', borderRadius: '12px', border: 'none', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <><UserPlus size={18} /> Register & Select</>}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* SEARCH VIEW */
                    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div className="selection-search-wrapper">
                            <Search size={18} className="selection-search-icon" />
                            <input
                                autoFocus
                                className="selection-search-input"
                                placeholder="Search by name or phone..."
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {loading && <Loader2 size={18} className="animate-spin" style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />}
                        </div>

                        <div className="selection-results-list custom-scroll">
                            {results.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => handleSelection(c)}
                                    className="customer-selection-item"
                                >
                                    <div>
                                        <p style={{ fontWeight: 800, margin: '0 0 2px 0', fontSize: '1.05rem', color: 'var(--text-heading)' }}>{c.name}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{c.phone}</p>
                                    </div>
                                    <div className="points">
                                        <Award size={12} /> {c.points} Pts
                                    </div>
                                </div>
                            ))}

                            <button 
                                onClick={() => {
                                    setIsRegisterMode(true);
                                    const looksLikePhone = /^[0-9+]+$/.test(search);
                                    setNewGuest({
                                        name: looksLikePhone ? '' : search,
                                        phone: looksLikePhone ? search : ''
                                    });
                                }} 
                                className="btn-ghost" 
                                style={{ 
                                    padding: '1.25rem', 
                                    borderRadius: '16px', 
                                    border: '1px dashed var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    marginTop: '0.75rem',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)'
                                }}
                            >
                                <UserPlus size={20} />
                                <span>
                                    {results.length === 0 && search.length > 2 
                                      ? `Register "${search}"?`
                                      : 'Quick Register New Guest'}
                                </span>
                            </button>

                            {search.length > 0 && search.length < 2 && (
                                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    Keep typing to search...
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    Linked guests earn loyalty points on every visit!
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CustomerSelectionModal;
