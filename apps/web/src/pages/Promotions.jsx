import React, { useEffect, useState } from 'react';
import { CalendarClock, CircleDollarSign, Loader2, Percent, Plus, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { formatCurrency } from '../utils/formatters';
import '../styles/components/promotions.css';

const emptyForm = () => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 1);
    return {
        name: '',
        description: '',
        type: 'PERCENTAGE',
        value: '',
        startsAt: toLocalInput(now),
        endsAt: toLocalInput(end)
    };
};

const toLocalInput = date => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    return localDate.toISOString().slice(0, 16);
};

const getStatus = promotion => {
    const now = Date.now();
    if (!promotion.isActive) return 'Paused';
    if (now < new Date(promotion.startsAt).getTime()) return 'Scheduled';
    if (now >= new Date(promotion.endsAt).getTime()) return 'Expired';
    return 'Active';
};

const Promotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formVisible, setFormVisible] = useState(false);

    const fetchPromotions = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/promotions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load promotions');
            if (!Array.isArray(data)) throw new Error('Unexpected promotions response');
            setPromotions(data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load promotions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const resetForm = () => {
        setForm(emptyForm());
        setEditingId(null);
        setFormVisible(false);
    };

    const handleSubmit = async event => {
        event.preventDefault();
        setSaving(true);
        const token = localStorage.getItem('restroToken');
        const body = {
            ...form,
            value: Number(form.value),
            description: form.description.trim() || null,
            startsAt: new Date(form.startsAt).toISOString(),
            endsAt: new Date(form.endsAt).toISOString()
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/promotions${editingId ? `/${editingId}` : ''}`, {
                method: editingId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save promotion');
            toast.success(editingId ? 'Promotion updated' : 'Promotion scheduled');
            resetForm();
            await fetchPromotions();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save promotion');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async promotion => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/promotions/${promotion.id}/active`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !promotion.isActive })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update promotion');
            toast.success(promotion.isActive ? 'Promotion paused' : 'Promotion activated');
            await fetchPromotions();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update promotion');
        }
    };

    const startEditing = promotion => {
        setEditingId(promotion.id);
        setForm({
            name: promotion.name,
            description: promotion.description || '',
            type: promotion.type,
            value: String(promotion.value),
            startsAt: toLocalInput(promotion.startsAt),
            endsAt: toLocalInput(promotion.endsAt)
        });
        setFormVisible(true);
    };

    const activeCount = promotions.filter(promotion => getStatus(promotion) === 'Active').length;
    const redemptionCount = promotions.reduce((total, promotion) => total + promotion.redemptionCount, 0);
    const discountGiven = promotions.reduce((total, promotion) => total + promotion.discountGiven, 0);
    const netSales = promotions.reduce((total, promotion) => total + promotion.netSales, 0);

    return (
        <div className="page-container animate-fade promotions-page">
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Promotions</h1>
                    <p>Create scheduled discounts and track their paid-order results.</p>
                </div>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                        if (formVisible) resetForm();
                        else {
                            setForm(emptyForm());
                            setEditingId(null);
                            setFormVisible(true);
                        }
                    }}
                >
                    <Plus size={18} /> {formVisible ? 'Close form' : 'New promotion'}
                </button>
            </div>

            <div className="promotion-summary-grid">
                <div className="promotion-summary-card">
                    <span><Tag size={16} /> Active now</span>
                    <strong>{activeCount}</strong>
                </div>
                <div className="promotion-summary-card">
                    <span><CalendarClock size={16} /> Paid redemptions</span>
                    <strong>{redemptionCount.toLocaleString()}</strong>
                </div>
                <div className="promotion-summary-card">
                    <span><Percent size={16} /> Discounts given</span>
                    <strong>{formatCurrency(discountGiven)}</strong>
                </div>
                <div className="promotion-summary-card">
                    <span><CircleDollarSign size={16} /> Net sales</span>
                    <strong>{formatCurrency(netSales)}</strong>
                </div>
            </div>

            {formVisible && (
                <form className="promotion-form" onSubmit={handleSubmit}>
                    <div className="promotion-form-heading">
                        <div>
                            <h2>{editingId ? 'Edit promotion' : 'Schedule a promotion'}</h2>
                            <p>Promotions can be selected by staff when placing an order.</p>
                        </div>
                    </div>
                    <div className="promotion-form-grid">
                        <label>
                            Promotion name
                            <input
                                required
                                maxLength={80}
                                value={form.name}
                                onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                                placeholder="e.g. Weekend special"
                            />
                        </label>
                        <label>
                            Discount type
                            <select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))}>
                                <option value="PERCENTAGE">Percentage</option>
                                <option value="FIXED">Fixed amount</option>
                            </select>
                        </label>
                        <label>
                            Discount value {form.type === 'PERCENTAGE' ? '(%)' : '(Rs.)'}
                            <input
                                required
                                type="number"
                                min="0.01"
                                max={form.type === 'PERCENTAGE' ? 100 : undefined}
                                step="0.01"
                                value={form.value}
                                onChange={event => setForm(current => ({ ...current, value: event.target.value }))}
                            />
                        </label>
                        <label>
                            Starts at
                            <input
                                required
                                type="datetime-local"
                                value={form.startsAt}
                                onChange={event => setForm(current => ({ ...current, startsAt: event.target.value }))}
                            />
                        </label>
                        <label>
                            Ends at
                            <input
                                required
                                type="datetime-local"
                                value={form.endsAt}
                                onChange={event => setForm(current => ({ ...current, endsAt: event.target.value }))}
                            />
                        </label>
                        <label className="promotion-description-field">
                            Description (optional)
                            <input
                                maxLength={300}
                                value={form.description}
                                onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                                placeholder="Short note for staff"
                            />
                        </label>
                    </div>
                    <div className="promotion-form-actions">
                        <button type="button" className="promotion-secondary-button" onClick={resetForm}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                            {editingId ? 'Save changes' : 'Schedule promotion'}
                        </button>
                    </div>
                </form>
            )}

            <section className="promotion-list-section">
                <div className="promotion-list-heading">
                    <div>
                        <h2>All promotions</h2>
                        <p>Redemption and sales totals include paid orders only.</p>
                    </div>
                </div>
                {loading ? (
                    <div className="promotion-loading"><Loader2 size={28} className="animate-spin" /></div>
                ) : promotions.length === 0 ? (
                    <div className="promotion-empty">
                        <Tag size={28} />
                        <h3>No promotions yet</h3>
                        <p>Schedule your first offer to make it available in the order screen.</p>
                    </div>
                ) : (
                    <div className="promotion-list">
                        {promotions.map(promotion => {
                            const status = getStatus(promotion);
                            return (
                                <article className="promotion-card" key={promotion.id}>
                                    <div className="promotion-card-main">
                                        <div className="promotion-card-title">
                                            <h3>{promotion.name}</h3>
                                            <span className={`promotion-status ${status.toLowerCase()}`}>{status}</span>
                                        </div>
                                        {promotion.description && <p className="promotion-description">{promotion.description}</p>}
                                        <strong className="promotion-value">
                                            {promotion.type === 'PERCENTAGE'
                                                ? `${promotion.value}% off`
                                                : `${formatCurrency(promotion.value)} off`}
                                        </strong>
                                        <span className="promotion-dates">
                                            {new Date(promotion.startsAt).toLocaleString()} – {new Date(promotion.endsAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="promotion-metrics">
                                        <div><strong>{promotion.redemptionCount.toLocaleString()}</strong><span>Redemptions</span></div>
                                        <div><strong>{formatCurrency(promotion.discountGiven)}</strong><span>Discounts given</span></div>
                                        <div><strong>{formatCurrency(promotion.netSales)}</strong><span>Net sales</span></div>
                                    </div>
                                    <div className="promotion-card-actions">
                                        <button type="button" className="promotion-secondary-button" onClick={() => startEditing(promotion)}>Edit</button>
                                        <button
                                            type="button"
                                            className="promotion-secondary-button"
                                            onClick={() => handleToggle(promotion)}
                                        >
                                            {promotion.isActive ? 'Pause' : 'Activate'}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Promotions;
