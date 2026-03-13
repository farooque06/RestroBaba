import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Save, 
    Trash2, 
    Shield, 
    Zap, 
    Users, 
    Layout, 
    Check, 
    X,
    Loader2,
    DollarSign,
    Tag,
    Clock,
    AlertCircle,
    Settings,
    TableProperties,
    ChefHat,
    ShieldCheck,
    Package,
    BarChart3
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';

const PlanManagement = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/plans`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setPlans(data);
            }
        } catch (err) {
            toast.error('Failed to fetch plans');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePlan = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('restroToken');
            const method = editingPlan.id ? 'PATCH' : 'POST';
            const url = editingPlan.id 
                ? `${API_BASE_URL}/api/plans/${editingPlan.id}`
                : `${API_BASE_URL}/api/plans`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editingPlan)
            });

            if (response.ok) {
                toast.success('Plan saved successfully');
                fetchPlans();
                setEditingPlan(null);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to save plan');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this plan?')) return;
        
        try {
            const token = localStorage.getItem('restroToken');
            const response = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Plan deactivated');
                fetchPlans();
            }
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <div className="premium-glass" style={{ padding: '2rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
        </div>
    );

    const getTierColor = (tier) => {
        switch(tier) {
            case 'GOLD': return { main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.15)', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' };
            case 'DIAMOND': return { main: '#38bdf8', glow: 'rgba(56, 189, 248, 0.15)', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' };
            default: return { main: '#94a3b8', glow: 'rgba(148, 163, 184, 0.15)', gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' };
        }
    };

    return (
        <div className="page-container animate-fade" style={{ width: '100%', maxWidth: '100%', padding: '2rem' }}>
            <header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '2.5rem',
                width: '100%'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div className="premium-glass" style={{ padding: '6px', borderRadius: '8px', color: 'var(--primary)' }}>
                            <Zap size={18} fill="var(--primary)" style={{ opacity: 0.2 }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>Revenue Operations</span>
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>Subscription Models</h1>
                </div>
                {!editingPlan && (
                    <button 
                        className="btn-primary" 
                        style={{ height: '44px', padding: '0 1.25rem', borderRadius: '12px' }}
                        onClick={() => setEditingPlan({ 
                            tier: 'SILVER', name: '', monthlyPrice: 0, quarterlyPrice: 0, yearlyPrice: 0,
                            maxStaff: 2, maxTables: 10, features: [], isActive: true 
                        })}
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Deploy Model</span>
                    </button>
                )}
            </header>

            {editingPlan ? (
                <div className="premium-glass animate-slideUp" style={{ 
                    padding: '0', 
                    maxWidth: '800px', 
                    margin: '0 auto', 
                    overflow: 'hidden',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.4)'
                }}>
                    <div style={{ 
                        padding: '1.5rem 2rem', 
                        background: 'rgba(255,255,255,0.03)', 
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '8px', 
                                background: getTierColor(editingPlan.tier).gradient,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                <Shield size={16} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{editingPlan.id ? 'Refine Model' : 'Architect New Plan'}</h2>
                            </div>
                        </div>
                        <button className="btn-ghost" onClick={() => setEditingPlan(null)} style={{ padding: '8px' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSavePlan} style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Section: Identity */}
                            <section>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)' }}>
                                    <Tag size={14} />
                                    <h3 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identity & Tiering</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label className="input-label" style={{ fontSize: '0.75rem' }}>Commercial Name</label>
                                        <input 
                                            className="auth-input" 
                                            style={{ height: '40px', fontSize: '0.9rem' }}
                                            value={editingPlan.name} 
                                            onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                                            placeholder="e.g. Enterprise Diamond"
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" style={{ fontSize: '0.75rem' }}>System Tier</label>
                                        <select 
                                            className="auth-input" 
                                            style={{ height: '40px', fontSize: '0.9rem' }}
                                            value={editingPlan.tier}
                                            onChange={e => setEditingPlan({...editingPlan, tier: e.target.value})}
                                        >
                                            <option value="SILVER">SILVER</option>
                                            <option value="GOLD">GOLD</option>
                                            <option value="DIAMOND">DIAMOND</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* Section: Revenue Nodes */}
                            <section>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)' }}>
                                    <DollarSign size={14} />
                                    <h3 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing Architecture (NPR)</h3>
                                </div>
                                <div className="premium-glass" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div className="input-group">
                                            <label className="input-label" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Monthly RR</label>
                                            <input type="number" className="auth-input" style={{ height: '36px', fontSize: '0.85rem' }} value={editingPlan.monthlyPrice} onChange={e => setEditingPlan({...editingPlan, monthlyPrice: parseFloat(e.target.value)})} />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Quarterly RR</label>
                                            <input type="number" className="auth-input" style={{ height: '36px', fontSize: '0.85rem' }} value={editingPlan.quarterlyPrice} onChange={e => setEditingPlan({...editingPlan, quarterlyPrice: parseFloat(e.target.value)})} />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Annual RR</label>
                                            <input type="number" className="auth-input" style={{ height: '36px', fontSize: '0.85rem' }} value={editingPlan.yearlyPrice} onChange={e => setEditingPlan({...editingPlan, yearlyPrice: parseFloat(e.target.value)})} />
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div className="input-group">
                                            <label className="input-label" style={{ color: '#fbbf24', fontSize: '0.7rem' }}>Promo Price</label>
                                            <input type="number" className="auth-input" style={{ height: '36px', fontSize: '0.85rem', borderColor: 'rgba(251, 191, 36, 0.3)' }} value={editingPlan.offerMonthly || ''} onChange={e => setEditingPlan({...editingPlan, offerMonthly: parseFloat(e.target.value) || null})} placeholder="Optional" />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label" style={{ fontSize: '0.7rem' }}>Discount Text</label>
                                            <input className="auth-input" style={{ height: '36px', fontSize: '0.85rem' }} value={editingPlan.discountLabel || ''} onChange={e => setEditingPlan({...editingPlan, discountLabel: e.target.value})} placeholder="40% OFF" />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label" style={{ fontSize: '0.7rem' }}>Badge Tag</label>
                                            <input className="auth-input" style={{ height: '36px', fontSize: '0.85rem' }} value={editingPlan.offerTag || ''} onChange={e => setEditingPlan({...editingPlan, offerTag: e.target.value})} placeholder="Bestseller" />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section: Entitlements */}
                            <section>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)' }}>
                                    <Check size={14} />
                                    <h3 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Limits & Entitlements</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div className="input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <Users size={14} color="var(--text-muted)" />
                                            <label className="input-label" style={{ marginBottom: 0, fontSize: '0.75rem' }}>Staff Capacity</label>
                                        </div>
                                        <input type="number" className="auth-input" style={{ height: '36px', fontSize: '0.85rem' }} value={editingPlan.maxStaff} onChange={e => setEditingPlan({...editingPlan, maxStaff: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <Layout size={14} color="var(--text-muted)" />
                                            <label className="input-label" style={{ marginBottom: 0, fontSize: '0.75rem' }}>Table Volume</label>
                                        </div>
                                        <input type="number" className="auth-input" style={{ height: '36px', fontSize: '0.85rem' }} value={editingPlan.maxTables} onChange={e => setEditingPlan({...editingPlan, maxTables: parseInt(e.target.value)})} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {[
                                        { id: 'hasKDS', label: 'Kitchen Intelligence', icon: ChefHat },
                                        { id: 'hasInventory', label: 'Asset Management', icon: Package },
                                        { id: 'hasAnalytics', label: 'Business Intelligence', icon: BarChart3 },
                                        { id: 'hasMultiUnit', label: 'Global Infrastructure', icon: ShieldCheck },
                                    ].map(feat => (
                                        <div 
                                            key={feat.id} 
                                            onClick={() => setEditingPlan({...editingPlan, [feat.id]: !editingPlan[feat.id]})}
                                            className="premium-glass"
                                            style={{
                                                padding: '0.75rem 1rem',
                                                background: editingPlan[feat.id] ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)',
                                                border: `1px solid ${editingPlan[feat.id] ? 'var(--primary)' : 'var(--glass-border)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ 
                                                padding: '6px', 
                                                borderRadius: '6px', 
                                                background: editingPlan[feat.id] ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                color: editingPlan[feat.id] ? 'white' : 'var(--text-muted)'
                                            }}>
                                                <feat.icon size={14} />
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: editingPlan[feat.id] ? 'var(--text-main)' : 'var(--text-muted)' }}>{feat.label}</span>
                                            <div style={{ marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid', borderColor: editingPlan[feat.id] ? 'var(--primary)' : 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {editingPlan[feat.id] && <Check size={10} color="var(--primary)" strokeWidth={4} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                            <button type="button" className="btn-ghost" onClick={() => setEditingPlan(null)} style={{ flex: 1, height: '44px', fontSize: '0.9rem' }}>Discard</button>
                            <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 2, height: '44px', borderRadius: '12px' }}>
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Commit Changes</span>
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="theme-grid" style={{ 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '1.5rem',
                    width: '100%',
                    alignItems: 'start'
                }}>
                    {plans.map(p => {
                        const tier = getTierColor(p.tier);
                        return (
                            <div key={p.id} className="premium-glass card-hover" style={{ 
                                padding: '0', 
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex', 
                                flexDirection: 'column', 
                                border: `1px solid ${p.isActive ? 'var(--glass-border)' : 'rgba(239, 68, 68, 0.4)'}`,
                                transition: 'all 0.3s ease'
                            }}>
                                {/* Tier Header */}
                                <div style={{ 
                                    padding: '1.25rem 1.5rem', 
                                    background: `linear-gradient(to right, ${tier.glow}, transparent)`,
                                    borderBottom: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: tier.main }}></div>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: tier.main, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.tier}</span>
                                        </div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{p.name}</h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button className="icon-btn premium-glass shadow-sm" style={{ padding: '6px' }} onClick={() => setEditingPlan(p)}><Settings size={14} /></button>
                                        <button className="icon-btn premium-glass shadow-sm" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDeletePlan(p.id)}><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <div style={{ padding: '1.5rem' }}>
                                    {/* Price Core */}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>Rs.</span>
                                            <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em' }}>
                                                {new Intl.NumberFormat().format(p.offerMonthly || p.monthlyPrice)}
                                            </span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>/mo</span>
                                        </div>
                                        {p.offerMonthly && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Rs. {p.monthlyPrice}</span>
                                                <span style={{ background: 'var(--success-glow)', color: '#22c55e', padding: '2px 8px', borderRadius: '30px', fontSize: '0.65rem', fontWeight: 800 }}>
                                                    {p.discountLabel || 'SAVING'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Limits Visualization */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        <div className="premium-glass" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                                            <Users size={16} color="var(--primary)" style={{ marginBottom: '4px' }} />
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{p.maxStaff}</div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Staff</div>
                                        </div>
                                        <div className="premium-glass" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                                            <TableProperties size={16} color="var(--primary)" style={{ marginBottom: '4px' }} />
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{p.maxTables}</div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Tables</div>
                                        </div>
                                    </div>

                                    {/* Features Checklist */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                            {[
                                                { label: 'Kitchen Module', checked: p.hasKDS },
                                                { label: 'Inventory Logic', checked: p.hasInventory },
                                                { label: 'Profit Engines', checked: p.hasAnalytics },
                                                { label: 'Global Units', checked: p.hasMultiUnit },
                                            ].map((f, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: f.checked ? 1 : 0.4 }}>
                                                    <div style={{ 
                                                        width: '14px', 
                                                        height: '14px', 
                                                        borderRadius: '4px', 
                                                        background: f.checked ? 'var(--primary)' : 'transparent',
                                                        border: f.checked ? 'none' : '1.5px solid var(--glass-border)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {f.checked && <Check size={10} color="white" strokeWidth={4} />}
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: f.checked ? 'var(--text-main)' : 'var(--text-muted)' }}>{f.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {p.offerTag && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '12px', 
                                        right: '-25px', 
                                        background: tier.gradient,
                                        color: 'white',
                                        padding: '2px 30px',
                                        fontSize: '0.6rem',
                                        fontWeight: 900,
                                        transform: 'rotate(45deg)',
                                        textTransform: 'uppercase',
                                        pointerEvents: 'none'
                                    }}>
                                        {p.offerTag}
                                    </div>
                                )}

                                {!p.isActive && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        inset: 0, 
                                        background: 'rgba(0,0,0,0.6)', 
                                        backdropFilter: 'grayscale(1) blur(2px)', 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        gap: '8px',
                                        zIndex: 10
                                    }}>
                                        <AlertCircle size={32} color="#ef4444" />
                                        <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>Inactive</span>
                                        <button className="btn-ghost" style={{ border: '1px solid white', color: 'white', height: '32px', fontSize: '0.8rem' }} onClick={() => setEditingPlan({...p, isActive: true})}>Restore</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PlanManagement;
