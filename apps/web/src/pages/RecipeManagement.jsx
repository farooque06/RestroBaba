import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { ChefHat, Plus, Save, Trash2, ArrowLeft, Loader2, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const RecipeManagement = ({ menuItem, onBack }) => {
    const [inventory, setInventory] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('restroToken');
        try {
            const [invRes, recipeRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/inventory`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/recipes/${menuItem.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const invData = await invRes.json();
            const recipeData = await recipeRes.json();

            setInventory(invData);
            if (recipeRes.ok && recipeData.length > 0) {
                setIngredients(recipeData.map(r => ({
                    inventoryItemId: r.inventoryItemId,
                    quantity: r.quantity
                })));
            }
        } catch (err) {
            console.error('Failed to fetch recipe data', err);
        } finally {
            setLoading(false);
        }
    };

    const addIngredient = () => {
        setIngredients([...ingredients, { inventoryItemId: '', quantity: '' }]);
    };

    const removeIngredient = (index) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const updateIngredient = (index, field, value) => {
        const newIng = [...ingredients];
        newIng[index][field] = value;
        setIngredients(newIng);
    };

    const handleSave = async () => {
        if (ingredients.some(i => !i.inventoryItemId || !i.quantity)) {
            toast.error('Please fill all ingredient details');
            return;
        }

        setSubmitting(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    menuItemId: menuItem.id,
                    ingredients
                })
            });

            if (response.ok) {
                toast.success('Recipe saved successfully');
                onBack();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to save recipe');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="animate-fade">
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '1rem' }}>
                <ArrowLeft size={18} />
                Back to Menu
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Define Recipe: {menuItem.name}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Specify the exact ingredients used for one portion of this dish.</p>
                </div>
                <button onClick={handleSave} disabled={submitting} className="nav-item active" style={{ border: 'none', padding: '0.75rem 2rem', borderRadius: '12px', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    <span>Save Recipe</span>
                </button>
            </div>

            <div className="premium-glass" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {ingredients.map((ing, index) => (
                        <div key={index} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', padding: '1.5rem', background: 'var(--glass-shine)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                            <div className="input-group" style={{ flex: 2 }}>
                                <label>Ingredient (from Inventory)</label>
                                <select
                                    className="auth-input"
                                    value={ing.inventoryItemId}
                                    onChange={e => updateIngredient(index, 'inventoryItemId', e.target.value)}
                                    style={{ appearance: 'none' }}
                                >
                                    <option value="">Select Item...</option>
                                    {inventory.map(item => (
                                        <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit} available)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>Quantity per Portion</label>
                                <input
                                    className="auth-input"
                                    type="number"
                                    step="0.001"
                                    placeholder="0.00"
                                    value={ing.quantity}
                                    onChange={e => updateIngredient(index, 'quantity', e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => removeIngredient(index)}
                                style={{
                                    padding: '0.8rem',
                                    borderRadius: '12px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: 'var(--danger)',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addIngredient}
                        style={{
                            padding: '1.5rem',
                            borderRadius: '16px',
                            border: '2px dashed var(--glass-border)',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginTop: '0.5rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                    >
                        <Plus size={20} />
                        <span style={{ fontWeight: 600 }}>Add Ingredient</span>
                    </button>
                </div>

                {ingredients.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <ChefHat size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                        <p>No ingredients defined yet. Add the first one to track stock!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipeManagement;
