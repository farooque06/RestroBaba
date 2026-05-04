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
                    <form onSubmit={handleRegister} className="selection-register-form animate-fade">
                        <div className="selection-form-group">
                            <label>Full Name</label>
                            <input
                                autoFocus
                                className="selection-form-input"
                                placeholder="Enter guest name..."
                                value={newGuest.name}
                                onChange={e => setNewGuest({ ...newGuest, name: e.target.value })}
                            />
                        </div>
                        <div className="selection-form-group">
                            <label>Phone Number</label>
                            <input
                                className="selection-form-input"
                                type="tel"
                                placeholder="98XXXXXXXX"
                                value={newGuest.phone}
                                onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })}
                            />
                        </div>
                        <div className="selection-form-actions">
                            <button 
                                type="button"
                                onClick={() => setIsRegisterMode(false)} 
                                className="selection-btn-cancel"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={submitting}
                                className="selection-btn-submit"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <><UserPlus size={18} /> Register & Select</>}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* SEARCH VIEW */
                    <div className="selection-search-view animate-fade">
                        <div className="selection-search-wrapper">
                            <Search size={18} className="selection-search-icon" />
                            <input
                                autoFocus
                                className="selection-search-input"
                                placeholder="Search by name or phone..."
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {loading && <Loader2 size={18} className="selection-search-loader animate-spin" />}
                        </div>

                        <div className="selection-results-list custom-scroll">
                            {results.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => handleSelection(c)}
                                    className="customer-selection-item"
                                >
                                    <div className="selection-item-info">
                                        <p className="selection-item-name">{c.name}</p>
                                        <p className="selection-item-phone">{c.phone}</p>
                                    </div>
                                    <div className="selection-item-points">
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
                                className="selection-register-btn" 
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
                
                <div className="selection-modal-footer">
                    Linked guests earn loyalty points on every visit!
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CustomerSelectionModal;
