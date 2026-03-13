import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { ChefHat, Plus, Save, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
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
        <div className="page-container flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)' }}>Loading ingredients...</p>
        </div>
    );

    return (
        <div className="page-container rm-container">
            <button onClick={onBack} className="rm-back-btn">
                <ArrowLeft size={18} />
                <span>Back to Menu Management</span>
            </button>

            <div className="rm-header">
                <div className="rm-title-section">
                    <h2>Define Recipe: {menuItem.name}</h2>
                    <p>Specify the exact ingredients used for one portion of this dish to automate stock tracking.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={submitting} 
                    className="nav-item active rm-save-btn"
                    style={{ border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    <span>Save Recipe</span>
                </button>
            </div>

            <div className="premium-glass rm-content-glass">
                <div className="rm-ingredients-list">
                    {ingredients.map((ing, index) => (
                        <div key={index} className="rm-ingredient-row">
                            <div className="input-group rm-input-item">
                                <label>Ingredient (from Inventory)</label>
                                <select
                                    className="auth-input"
                                    value={ing.inventoryItemId}
                                    onChange={e => updateIngredient(index, 'inventoryItemId', e.target.value)}
                                    style={{ appearance: 'auto' }}
                                >
                                    <option value="">Select Item...</option>
                                    {inventory.map(item => (
                                        <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit} available)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group rm-input-qty">
                                <label>Qty per Portion</label>
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
                                className="rm-remove-btn"
                                title="Remove Ingredient"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}

                    <button onClick={addIngredient} className="rm-add-btn">
                        <Plus size={22} />
                        <span>Add Ingredient to Recipe</span>
                    </button>
                </div>

                {ingredients.length === 0 && (
                    <div className="rm-empty-state">
                        <ChefHat size={64} />
                        <p>No ingredients defined yet. Add the first one to start tracking stock automatically!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipeManagement;
