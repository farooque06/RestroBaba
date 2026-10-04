import React, { useEffect, useId, useState } from 'react';
import { CalendarClock, Check, CirclePlus, Clock3, Info, Loader2, Pencil, Plus, Sparkles, Tag, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { formatCurrency } from '../utils/formatters';
import Dropdown from '../components/common/Dropdown';

const blankGroup = () => ({ name: '', required: true, categoryId: '', suggestedName: '', options: [{ menuItemId: '', extraPrice: '0' }] });
const blankDeal = () => ({
    name: '',
    description: '',
    price: '',
    isAvailable: true,
    startsAt: '',
    endsAt: '',
    groups: [blankGroup()]
});

const dateTimeValue = value => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const dealStatus = deal => {
    const now = Date.now();
    if (!deal.isAvailable) return 'Paused';
    if (deal.startsAt && new Date(deal.startsAt).getTime() > now) return 'Scheduled';
    if (deal.endsAt && new Date(deal.endsAt).getTime() <= now) return 'Expired';
    return 'Enabled';
};

const InfoHint = ({ text }) => {
    const tooltipId = useId();
    return (
        <span className="combo-info-hint">
            <button type="button" className="combo-info-button" aria-label="More information" aria-describedby={tooltipId}>
                <Info size={14} />
            </button>
            <span id={tooltipId} className="combo-info-tooltip" role="tooltip">{text}</span>
        </span>
    );
};

const ComboDeals = () => {
    const [deals, setDeals] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [form, setForm] = useState(blankDeal());
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const categories = [...new Map(menuItems
        .filter(item => item.category?.id && item.category?.name)
        .map(item => [item.category.id, { id: item.category.id, name: item.category.name }]))
        .values()]
        .sort((a, b) => a.name.localeCompare(b.name));

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('restroToken')}`
    });

    const getRequestError = async (response, resource) => {
        let detail = response.statusText || 'Request failed';
        try {
            const body = await response.json();
            if (body.error) detail = body.error;
        } catch (error) {
            console.warn(`${resource} request returned a non-JSON error`, error);
        }
        return `${resource} request failed (${response.status}): ${detail}`;
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                fetch(`${API_BASE_URL}/api/combos?manage=true`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/menu/items`, { headers: authHeaders() })
            ]);
            const errors = [];

            for (const [index, resource] of ['Combo deals', 'Menu items'].entries()) {
                const result = results[index];
                if (result.status === 'rejected') {
                    console.error(`${resource} request failed`, result.reason);
                    errors.push(`${resource} could not be reached`);
                    continue;
                }
                if (!result.value.ok) {
                    errors.push(await getRequestError(result.value, resource));
                    continue;
                }

                const data = await result.value.json();
                if (resource === 'Combo deals') {
                    setDeals(data);
                } else {
                    setMenuItems(data.filter(item => !item.isDeleted));
                }
            }

            if (errors.length > 0) {
                toast.error(errors.join(' · '));
            }
        } catch (error) {
            console.error('Failed to load combo deals', error);
            toast.error('The server returned invalid data while loading combo deals or menu items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const updateGroup = (groupIndex, changes) => {
        setForm(current => ({
            ...current,
            groups: current.groups.map((group, index) => index === groupIndex ? { ...group, ...changes } : group)
        }));
    };

    const updateGroupCategory = (groupIndex, categoryId) => {
        const categoryName = categories.find(category => category.id === categoryId)?.name;
        const suggestedName = categoryName ? `Choose from ${categoryName}` : '';
        setForm(current => ({
            ...current,
            groups: current.groups.map((group, index) => {
                if (index !== groupIndex) return group;
                const canReplaceName = !group.name.trim() || group.name === group.suggestedName;
                return {
                    ...group,
                    categoryId,
                    suggestedName,
                    name: canReplaceName && suggestedName ? suggestedName : group.name
                };
            })
        }));
    };

    const updateOption = (groupIndex, optionIndex, changes) => {
        setForm(current => ({
            ...current,
            groups: current.groups.map((group, index) => index === groupIndex ? {
                ...group,
                options: group.options.map((option, indexInGroup) =>
                    indexInGroup === optionIndex ? { ...option, ...changes } : option
                )
            } : group)
        }));
    };

    const startEditing = deal => {
        setEditingId(deal.id);
        setForm({
            name: deal.name,
            description: deal.description || '',
            price: String(deal.price),
            isAvailable: deal.isAvailable,
            startsAt: dateTimeValue(deal.startsAt),
            endsAt: dateTimeValue(deal.endsAt),
            groups: deal.groups.map(group => ({
                name: group.name,
                required: group.required,
                categoryId: group.options[0]?.menuItem?.categoryId || group.options[0]?.menuItem?.category?.id || '',
                suggestedName: '',
                options: group.options.map(option => ({
                    menuItemId: option.menuItemId,
                    extraPrice: String(option.extraPrice)
                }))
            }))
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(blankDeal());
    };

    const saveDeal = async event => {
        event.preventDefault();
        if (!form.groups.some(group => group.required)) {
            toast.error('Add at least one required choice group');
            return;
        }
        if (form.groups.some(group => !group.name.trim() || group.options.length === 0 || group.options.some(option => !option.menuItemId))) {
            toast.error('Every choice group needs a name and at least one menu item');
            return;
        }

        setSaving(true);
        const payload = {
            ...form,
            price: Number(form.price),
            startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
            endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
            groups: form.groups.map(group => ({
                name: group.name,
                required: group.required,
                options: group.options.map(option => ({
                    menuItemId: option.menuItemId,
                    extraPrice: Number(option.extraPrice)
                }))
            }))
        };

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/combos${editingId ? `/${editingId}` : ''}`,
                {
                    method: editingId ? 'PUT' : 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify(payload)
                }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save combo deal');
            toast.success(editingId ? 'Combo deal updated' : 'Combo deal created');
            resetForm();
            await loadData();
        } catch (error) {
            console.error('Failed to save combo deal', error);
            toast.error(error.message || 'Failed to save combo deal');
        } finally {
            setSaving(false);
        }
    };

    const deleteDeal = async deal => {
        if (!window.confirm(`Delete "${deal.name}"? Existing orders will keep their recorded prices.`)) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/combos/${deal.id}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete combo deal');
            setDeals(current => current.filter(item => item.id !== deal.id));
            if (editingId === deal.id) resetForm();
            toast.success('Combo deal deleted');
        } catch (error) {
            console.error('Failed to delete combo deal', error);
            toast.error(error.message || 'Failed to delete combo deal');
        }
    };

    return (
        <div className="page-container combo-deals-page animate-fade">
            <header className="combo-deals-header">
                <div>
                    <div className="combo-deals-eyebrow"><Sparkles size={15} /> Menu merchandising</div>
                    <h1 className="combo-deals-title">Combo Deals</h1>
                    <p className="combo-deals-subtitle">Create a meal worth coming back for. Bundle favorites, offer upgrades, and schedule specials.</p>
                </div>
            </header>

            <form onSubmit={saveDeal} className="premium-glass combo-form">
                <div className="combo-form-header">
                    <div className="combo-form-heading">
                        <div className="combo-form-icon"><CirclePlus size={20} /></div>
                        <div>
                            <h2 className="combo-form-title">{editingId ? 'Edit combo deal' : 'Create a combo deal'}</h2>
                            <p className="combo-form-caption">Set your bundle, then give guests great choices.</p>
                        </div>
                    </div>
                    {editingId && (
                        <button type="button" className="combo-action-button" onClick={resetForm}>
                            <X size={16} /> Cancel
                        </button>
                    )}
                </div>

                <div className="combo-form-body">
                    <div className="combo-fields-grid">
                        <div className="combo-field">
                            <div className="combo-field-label-row">
                                <label htmlFor="combo-name">Deal name</label>
                                <InfoHint text="The name staff see when adding this deal to an order." />
                            </div>
                            <input id="combo-name" required maxLength={100} value={form.name}
                                onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Lunch for two" />
                        </div>
                        <div className="combo-field">
                            <div className="combo-field-label-row">
                                <label htmlFor="combo-price">Bundle price</label>
                                <InfoHint text="The deal's starting price. Any selected upgrade charges are added to this amount." />
                            </div>
                            <input id="combo-price" required type="number" min="0.01" step="0.01" value={form.price}
                                onChange={event => setForm({ ...form, price: event.target.value })} placeholder="499.00" />
                        </div>
                        <div className="combo-field">
                            <div className="combo-field-label-row">
                                <label htmlFor="combo-starts-at"><Clock3 size={14} /> Starts at <span className="combo-optional">optional</span></label>
                                <InfoHint text="Leave blank to make the deal available immediately." />
                            </div>
                            <input type="datetime-local" value={form.startsAt}
                                id="combo-starts-at"
                                onChange={event => setForm({ ...form, startsAt: event.target.value })} />
                        </div>
                        <div className="combo-field">
                            <div className="combo-field-label-row">
                                <label htmlFor="combo-ends-at"><CalendarClock size={14} /> Ends at <span className="combo-optional">optional</span></label>
                                <InfoHint text="Leave blank if the deal has no end date." />
                            </div>
                            <input type="datetime-local" value={form.endsAt}
                                id="combo-ends-at"
                                onChange={event => setForm({ ...form, endsAt: event.target.value })} />
                        </div>
                    </div>
                    <div className="combo-field">
                        <div className="combo-field-label-row">
                            <label htmlFor="combo-description">Description <span className="combo-optional">optional</span></label>
                            <InfoHint text="A short note shown with the deal to help staff understand what the offer includes." />
                        </div>
                        <textarea maxLength={500} value={form.description}
                            id="combo-description"
                            onChange={event => setForm({ ...form, description: event.target.value })}
                            placeholder="e.g. A filling lunch with a drink included." />
                    </div>
                        <div className="combo-availability">
                            <input id="combo-available" type="checkbox" checked={form.isAvailable}
                                onChange={event => setForm({ ...form, isAvailable: event.target.checked })} />
                            <label htmlFor="combo-available"><strong>Available to order</strong></label>
                            <InfoHint text="Turn this off to pause the deal. Scheduled start and end dates still apply when it is on." />
                        </div>

                        <div className="combo-section-heading">
                            <div className="combo-section-title">
                                <h3>Build your choices</h3>
                                <InfoHint text="Each group is a question for the guest. They choose one menu item in each required group; optional groups can be skipped. Selected upgrade charges are added to the bundle price." />
                            </div>
                            <button type="button" className="combo-action-button" onClick={() => setForm(current => ({ ...current, groups: [...current.groups, blankGroup()] }))}>
                                <Plus size={16} /> Add group
                            </button>
                        </div>

                        <div className="combo-groups">
                            {form.groups.map((group, groupIndex) => (
                                <section key={groupIndex} className="combo-group">
                                    <div className="combo-group-header">
                                        <input className="combo-group-name" aria-label="Choice group name" required value={group.name}
                                            onChange={event => updateGroup(groupIndex, { name: event.target.value })} placeholder="Name this choice group, e.g. Pick a main" />
                                        <div className="combo-required-wrap">
                                            <label className="combo-required">
                                                <input type="checkbox" checked={group.required}
                                                    onChange={event => updateGroup(groupIndex, { required: event.target.checked })} />
                                                Required
                                            </label>
                                            <InfoHint text={group.required
                                                ? 'Guests must choose one item from this group.'
                                                : 'Guests can skip this group. If they choose an item, its extra charge is added to the deal price.'} />
                                        </div>
                                        {form.groups.length > 1 && (
                                            <button type="button" aria-label="Remove group" className="combo-icon-button"
                                                onClick={() => setForm(current => ({ ...current, groups: current.groups.filter((_, index) => index !== groupIndex) }))}>
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="combo-group-options">
                                        <div className="combo-category-filter">
                                            <div className="combo-field-label-row">
                                                <span>Menu category</span>
                                                <InfoHint text="Choose a category to show only matching menu items in the picker below. This is a filter; the group name remains editable." />
                                            </div>
                                            <Dropdown
                                                className="combo-menu-picker"
                                                style={{ width: '280px', maxWidth: '100%' }}
                                                options={[
                                                    { value: '', label: 'All categories' },
                                                    ...categories.map(category => ({
                                                        value: category.id,
                                                        label: category.name
                                                    }))
                                                ]}
                                                value={group.categoryId}
                                                onChange={categoryId => updateGroupCategory(groupIndex, categoryId)}
                                                placeholder="Filter choices by category"
                                            />
                                        </div>
                                        {group.options.map((option, optionIndex) => (
                                            <div key={optionIndex} className="combo-option-row">
                                                <div className="combo-option-item">
                                                    <Dropdown
                                                        className="combo-menu-picker"
                                                        options={menuItems.filter(item =>
                                                            !group.categoryId ||
                                                            item.category?.id === group.categoryId ||
                                                            group.options.some(existingOption => existingOption.menuItemId === item.id)
                                                        ).map(item => ({
                                                            value: item.id,
                                                            label: `${item.name} · ${formatCurrency(item.price)}${item.available ? '' : ' · unavailable'}`,
                                                            disabled: !item.available
                                                        }))}
                                                        value={option.menuItemId}
                                                        onChange={value => updateOption(groupIndex, optionIndex, { menuItemId: value })}
                                                        placeholder="Choose a menu item"
                                                        isSearchable
                                                    />
                                                    <InfoHint text="Choose one menu item for this option. Add more menu choices to let staff offer alternatives." />
                                                </div>
                                                <div className="combo-option-extra">
                                                    <input className="combo-field-control combo-option-price" type="number" min="0" step="0.01" required value={option.extraPrice}
                                                        aria-label="Extra charge for this menu choice"
                                                        onChange={event => updateOption(groupIndex, optionIndex, { extraPrice: event.target.value })}
                                                        placeholder="+ charge" />
                                                    <InfoHint text="Extra charge added to the bundle price when this menu item is selected. Enter 0 if there is no extra charge." />
                                                </div>
                                                <button type="button" aria-label="Remove option" className="combo-icon-button"
                                                    disabled={group.options.length <= 1}
                                                    onClick={() => updateGroup(groupIndex, { options: group.options.filter((_, index) => index !== optionIndex) })}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" className="combo-action-button" style={{ marginTop: '0.8rem' }}
                                        onClick={() => updateGroup(groupIndex, { options: [...group.options, { menuItemId: '', extraPrice: '0' }] })}>
                                        <Plus size={15} /> Add menu choice
                                    </button>
                                </section>
                            ))}
                        </div>

                        <div className="combo-form-actions">
                            <button type="submit" className="combo-action-button combo-action-primary" disabled={saving || menuItems.length === 0}>
                                {saving ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
                                {editingId ? 'Save changes' : 'Create deal'}
                            </button>
                        </div>
                        {menuItems.length === 0 && <div role="status" className="combo-empty-state">Add a menu item before creating a combo.</div>}
                        </div>
            </form>

            <section className="combo-deals-section">
            <div className="combo-deals-section-header">
                <Tag size={19} color="var(--primary)" />
                <h2>Your deals</h2>
                <span>{deals.length}</span>
            </div>
            {loading ? (
                <div className="combo-deals-loading"><Loader2 className="animate-spin" size={30} /></div>
            ) : deals.length === 0 ? (
                <div className="combo-empty-state">
                    <div className="combo-empty-icon"><Sparkles size={19} /></div>
                    <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.3rem' }}>No deals just yet</strong>
                    Create your first bundle above and it will show up here.
                </div>
            ) : (
                <div className="combo-deals-grid">
                    {deals.map(deal => {
                        const status = dealStatus(deal);
                        return (
                        <article key={deal.id} className="premium-glass combo-deal-card">
                            <div className="combo-deal-card-top">
                                <div>
                                    <h3>{deal.name}</h3>
                                    <strong className="combo-deal-price">{formatCurrency(deal.price)}</strong>
                                </div>
                                <span className={`combo-status ${status === 'Enabled' ? 'enabled' : ''}`}>
                                    {status}
                                </span>
                            </div>
                            {deal.description && <p className="combo-deal-description">{deal.description}</p>}
                            <div className="combo-deal-groups">
                                {deal.groups.map(group => (
                                    <div className="combo-deal-group" key={group.id}>
                                        <strong>{group.name}</strong> {group.required ? '(required)' : '(optional upgrade)'}
                                        <span>{group.options.map(option =>
                                            `${option.menuItem.name}${option.extraPrice ? ` +${formatCurrency(option.extraPrice)}` : ''}`
                                        ).join(', ')}</span>
                                    </div>
                                ))}
                            </div>
                            {(deal.startsAt || deal.endsAt) && (
                                <p className="combo-deal-schedule">
                                    <CalendarClock size={15} />
                                    {deal.startsAt ? new Date(deal.startsAt).toLocaleString() : 'Now'} – {deal.endsAt ? new Date(deal.endsAt).toLocaleString() : 'No end'}
                                </p>
                            )}
                            <div className="combo-deal-actions">
                                <button type="button" className="combo-action-button" onClick={() => startEditing(deal)}><Pencil size={15} /> Edit</button>
                                <button type="button" className="combo-action-button" onClick={() => deleteDeal(deal)}><Trash2 size={15} /> Delete</button>
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

export default ComboDeals;
