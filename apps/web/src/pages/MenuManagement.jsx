import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Search, Plus, Filter, Tag, CheckCircle2, XCircle, Loader2, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RecipeManagement from './RecipeManagement';
import ConfirmModal from '../components/ConfirmModal';
import { formatCurrency } from '../utils/formatters';
import OptimizedImage from '../components/common/OptimizedImage';
import toast from 'react-hot-toast';
import foodPlaceholder from '../assets/food-placeholder.png';

const MenuManagement = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedItemForRecipe, setSelectedItemForRecipe] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });

    // Form States
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', categoryId: '', image: '' });
    const [newCategory, setNewCategory] = useState({ name: '', station: 'Kitchen' });
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [rawCategories, setRawCategories] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [linkedInventoryId, setLinkedInventoryId] = useState('');
    const [showQuickAddInventory, setShowQuickAddInventory] = useState(false);
    const [quickInventory, setQuickInventory] = useState({ name: '', unit: 'pcs', quantity: 0 });
    const [uploadingImg, setUploadingImg] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        fetchMenuData();
    }, []);

    const fetchMenuData = async () => {
        setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const [itemsRes, catsRes, invRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/menu/items`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/menu/categories`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/inventory`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const itemsData = await itemsRes.json();
            const catsData = await catsRes.json();
            const invData = await invRes.json();

            if (itemsRes.ok && catsRes.ok && invRes.ok) {
                setItems(itemsData);
                setRawCategories(catsData);
                setInventoryItems(invData);
                setCategories(['All', ...catsData.map(c => c.name)]);
            } else {
                setError('Failed to load menu data');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async (item) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/menu/items/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ available: !item.available })
            });

            if (response.ok) {
                setItems(items.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
            }
        } catch (err) {
            console.error('Failed to toggle availability', err);
        }
    };

    const deleteItem = (id) => {
        setConfirmAction({
            title: 'Delete Menu Item?',
            message: 'Are you sure you want to permanently delete this menu item? This action cannot be undone.',
            onConfirm: () => performDeleteItem(id)
        });
        setIsConfirmModalOpen(true);
    };

    const performDeleteItem = async (id) => {

        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/menu/items/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setItems(items.filter(i => i.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete item', err);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const token = localStorage.getItem('restroToken');
        const formData = new FormData();
        formData.append('image', file);

        setUploadingImg(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setNewItem({ ...newItem, image: data.url });
            } else {
                setError('Failed to upload image');
            }
        } catch (err) {
            setError('Upload connection error');
        } finally {
            setUploadingImg(false);
        }
    };

    const openEditItem = (item) => {
        setEditingItem(item);
        setNewItem({
            name: item.name,
            description: item.description || '',
            price: item.price.toString(),
            categoryId: item.categoryId,
            image: item.image || ''
        });
        setIsItemModalOpen(true);
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('restroToken');
        const url = editingItem
            ? `${API_BASE_URL}/api/menu/items/${editingItem.id}`
            : `${API_BASE_URL}/api/menu/items`;
        const method = editingItem ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newItem)
            });

            if (response.ok) {
                const item = await response.json();
                if (editingItem) {
                    setItems(items.map(i => i.id === editingItem.id ? item : i));
                    toast.success('Item updated');
                } else {
                    // 1. Check if we need to create a NEW inventory item first
                    let finalInventoryId = linkedInventoryId;
                    if (showQuickAddInventory && quickInventory.name) {
                        const invRes = await fetch(`${API_BASE_URL}/api/inventory`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                name: quickInventory.name,
                                unit: quickInventory.unit,
                                quantity: quickInventory.quantity,
                                minThreshold: 5
                            })
                        });
                        if (invRes.ok) {
                            const newInv = await invRes.json();
                            finalInventoryId = newInv.id;
                        }
                    }

                    // 2. Link to inventory if ID exists
                    if (finalInventoryId) {
                        await fetch(`${API_BASE_URL}/api/recipes`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                menuItemId: item.id,
                                ingredients: [{ inventoryItemId: finalInventoryId, quantity: 1 }]
                            })
                        });
                        fetchMenuData(); // Refresh to show stock
                    } else {
                        setItems([...items, item]);
                    }
                    toast.success('Item added');
                }

                setIsItemModalOpen(false);
                setEditingItem(null);
                setNewItem({ name: '', description: '', price: '', categoryId: '', image: '' });
                setLinkedInventoryId('');
                setShowQuickAddInventory(false);
                setQuickInventory({ name: '', unit: 'pcs', quantity: 0 });
            }
        } catch (err) {
            console.error('Failed to add item', err);
        }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('restroToken');
        const url = editingCategoryId
            ? `${API_BASE_URL}/api/menu/categories/${editingCategoryId}`
            : `${API_BASE_URL}/api/menu/categories`;
        const method = editingCategoryId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newCategory)
            });

            if (response.ok) {
                const category = await response.json();
                if (editingCategoryId) {
                    setRawCategories(rawCategories.map(c => c.id === editingCategoryId ? category : c));
                    setCategories(['All', ...rawCategories.map(c => c.id === editingCategoryId ? category.name : c.name)]);
                    toast.success('Category updated');
                } else {
                    setRawCategories([...rawCategories, category]);
                    setCategories(['All', ...[...rawCategories, category].map(c => c.name)]);
                    toast.success('Category created');
                }
                setNewCategory({ name: '', station: 'Kitchen' });
                setEditingCategoryId(null);
            } else {
                toast.error(`Failed to ${editingCategoryId ? 'update' : 'create'} category`);
            }
        } catch (err) {
            console.error('Failed to save category', err);
            toast.error('Network error. Please try again.');
        }
    };

    const handleDeleteCategory = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete the category "${name}"? Items in this category might become orphaned.`)) {
            return;
        }

        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/menu/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setRawCategories(rawCategories.filter(c => c.id !== id));
                setCategories(['All', ...rawCategories.filter(c => c.id !== id).map(c => c.name)]);
                toast.success('Category deleted');
            } else {
                toast.error('Failed to delete category. It might be in use.');
            }
        } catch (err) {
            console.error('Failed to delete category', err);
            toast.error('Network error. Please try again.');
        }
    };
    const filteredItems = items.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category.name === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)' }}>Loading menu items...</p>
        </div>
    );

    if (selectedItemForRecipe) {
        return <RecipeManagement menuItem={selectedItemForRecipe} onBack={() => setSelectedItemForRecipe(null)} />;
    }

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Menu Management</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage dishes for <strong style={{ color: 'var(--text-main)' }}>{user?.clientName}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => {
                            setNewCategory({ name: '', station: 'Kitchen' });
                            setEditingCategoryId(null);
                            setIsCategoryModalOpen(true);
                        }}
                        className="now-item"
                        style={{ border: '1px solid var(--glass-border)', background: 'var(--glass-shine)', color: 'var(--text-main)', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
                    >
                        <Tag size={20} />
                        <span>Manage Categories</span>
                    </button>
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setNewItem({ name: '', description: '', price: '', categoryId: '', image: '' });
                            setIsItemModalOpen(true);
                        }}
                        className="nav-item active"
                        style={{ border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
                    >
                        <Plus size={20} />
                        <span>Add New Item</span>
                    </button>
                </div>
            </div>

            <div className="premium-glass" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', flex: 1, paddingBottom: '0.5rem' }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: '10px',
                                background: selectedCategory === cat ? 'var(--primary)' : 'var(--glass-shine)',
                                border: '1px solid var(--glass-border)',
                                color: selectedCategory === cat ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="search-bar" style={{ width: '300px' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>
            </div>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {filteredItems.map(item => (
                    <div key={item.id} className="stat-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--bg-card)' }}>
                        <div style={{ height: '180px', width: '100%', position: 'relative' }}>
                            <OptimizedImage
                                src={item.image || foodPlaceholder}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', opacity: item.available ? 1 : 0.6 }}
                            />
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                padding: '0.35rem 0.8rem',
                                borderRadius: '20px',
                                background: item.available ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68,  red, 0.9)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                color: 'white',
                                backdropFilter: 'blur(8px)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {item.available ? 'In Stock' : 'Out of Stock'}
                            </div>
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '2rem 1rem 0.75rem',
                                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end'
                            }}>
                                <div style={{
                                    padding: '0.2rem 0.6rem',
                                    background: 'var(--primary)',
                                    borderRadius: '6px',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: 'white'
                                }}>
                                    {item.category?.name}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{item.name}</h3>
                                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(item.price)}</span>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4rem', lineHeight: '1.2rem' }}>
                                {item.description || 'No description available for this item.'}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.recipe?.length > 0 ? 'var(--primary)' : 'var(--text-muted)' }}></div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {item.recipe?.length > 0 ? 'Tracked Item' : 'Service Item'}
                                    </span>
                                </div>
                                {item.recipe && item.recipe.length > 0 && (
                                    <div style={{ textAlign: 'right' }}>
                                        {/* Quantity display removed as requested */}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => openEditItem(item)}
                                    className="premium-glass"
                                    style={{
                                        flex: 1,
                                        padding: '0.7rem',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-main)'
                                    }}
                                >
                                    <Edit2 size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => setSelectedItemForRecipe(item)}
                                    className="premium-glass"
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        color: 'var(--primary)'
                                    }}
                                >
                                    <Tag size={14} />
                                    Recipe
                                </button>
                                <button
                                    onClick={() => toggleAvailability(item)}
                                    className="premium-glass"
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        color: item.available ? 'var(--danger)' : 'var(--accent)',
                                    }}
                                >
                                    {item.available ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                    {item.available ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                    onClick={() => deleteItem(item.id)}
                                    style={{
                                        width: '40px',
                                        padding: '0.6rem',
                                        borderRadius: '10px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: 'var(--danger)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Item Modal */}
            {isItemModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '450px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
                        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                className="auth-input"
                                placeholder="Item Name"
                                required
                                value={newItem.name}
                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                            />
                            <textarea
                                className="auth-input"
                                placeholder="Description"
                                style={{ minHeight: '80px', paddingTop: '10px' }}
                                value={newItem.description}
                                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    className="auth-input"
                                    type="number"
                                    step="0.01"
                                    placeholder="Price"
                                    required
                                    value={newItem.price}
                                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                />
                                <select
                                    className="auth-input"
                                    required
                                    value={newItem.categoryId}
                                    onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })}
                                    style={{ appearance: 'none' }}
                                >
                                    <option value="">Select Category</option>
                                    {rawCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{
                                width: '100%',
                                padding: '1.5rem',
                                border: '2px dashed #333',
                                borderRadius: '12px',
                                textAlign: 'center',
                                position: 'relative',
                                background: 'rgba(255,255,255,0.02)'
                            }}>
                                {uploadingImg ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Uploading to cloud...</span>
                                    </div>
                                ) : newItem.image ? (
                                    <div style={{ position: 'relative' }}>
                                        <img src={newItem.image} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                                        <button
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, image: '' })}
                                            style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <Plus size={24} color="var(--text-muted)" />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Click to upload dish photo</span>
                                            <span style={{ fontSize: '0.7rem', color: '#555' }}>Supports PNG, JPG, WebP</span>
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    </label>
                                )}
                            </div>

                            <div className="input-group" style={{
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>INVENTORY LINKING</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickAddInventory(!showQuickAddInventory)}
                                        style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                                    >
                                        {showQuickAddInventory ? 'Back to select' : '+ Create New Stock Item'}
                                    </button>
                                </div>

                                {!showQuickAddInventory ? (
                                    <select
                                        className="auth-input"
                                        value={linkedInventoryId}
                                        onChange={e => setLinkedInventoryId(e.target.value)}
                                        style={{ appearance: 'none', marginBottom: 0 }}
                                    >
                                        <option value="">-- No Tracking (Service Item) --</option>
                                        {inventoryItems.map(inv => (
                                            <option key={inv.id} value={inv.id}>{inv.name} ({inv.quantity} {inv.unit})</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <input
                                            className="auth-input"
                                            placeholder="Stock Item Name (e.g. Mineral Water Bottle)"
                                            value={quickInventory.name}
                                            onChange={e => setQuickInventory({ ...quickInventory, name: e.target.value })}
                                            style={{ marginBottom: 0 }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                className="auth-input"
                                                type="number"
                                                placeholder="Initial Qty"
                                                value={quickInventory.quantity}
                                                onChange={e => setQuickInventory({ ...quickInventory, quantity: e.target.value })}
                                                style={{ flex: 1, marginBottom: 0 }}
                                            />
                                            <input
                                                className="auth-input"
                                                placeholder="Unit (pcs/kg)"
                                                value={quickInventory.unit}
                                                onChange={e => setQuickInventory({ ...quickInventory, unit: e.target.value })}
                                                style={{ flex: 1, marginBottom: 0 }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => {
                                    setIsItemModalOpen(false);
                                    setEditingItem(null);
                                    setNewItem({ name: '', description: '', price: '', categoryId: '', image: '' });
                                }} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" className="nav-item active" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                                    {editingItem ? 'Save Changes' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Categories Modal */}
            {isCategoryModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Manage Categories</h2>

                        {/* List of existing categories */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Existing Categories</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {rawCategories.map(cat => (
                                    <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, display: 'block' }}>{cat.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Station: {cat.station || 'Kitchen'}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => {
                                                    setEditingCategoryId(cat.id);
                                                    setNewCategory({ name: cat.name, station: cat.station || 'Kitchen' });
                                                }}
                                                className="premium-glass"
                                                style={{ padding: '0.5rem', borderRadius: '6px', color: 'var(--text-main)', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                className="premium-glass"
                                                style={{ padding: '0.5rem', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.1)' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {rawCategories.length === 0 && (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No categories found.</p>
                                )}
                            </div>
                        </div>

                        {/* Form to Add/Edit */}
                        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                {editingCategoryId ? 'Edit Category' : 'Create New Category'}
                            </h3>
                            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="input-group">
                                    <label>Category Name</label>
                                    <input
                                        className="auth-input"
                                        placeholder="e.g. Drinks, Appetizers"
                                        required
                                        value={newCategory.name}
                                        onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Kitchen Station</label>
                                    <select
                                        className="auth-input"
                                        value={newCategory.station}
                                        onChange={e => setNewCategory({ ...newCategory, station: e.target.value })}
                                        style={{ appearance: 'none' }}
                                    >
                                        <option value="Kitchen">Main Kitchen</option>
                                        <option value="Bar">Bar Area</option>
                                        <option value="Grill">Grill Station</option>
                                        <option value="Dessert">Dessert / Bakery</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    {editingCategoryId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingCategoryId(null);
                                                setNewCategory({ name: '', station: 'Kitchen' });
                                            }}
                                            style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'var(--glass-shine)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer' }}
                                        >
                                            Cancel Edit
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsCategoryModalOpen(false)}
                                        style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer' }}
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="submit"
                                        className="nav-item active"
                                        style={{ flex: editingCategoryId ? 2 : 1, padding: '0.8rem', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
                                    >
                                        {editingCategoryId ? 'Save Changes' : 'Create Category'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmAction.onConfirm}
                title={confirmAction.title}
                message={confirmAction.message}
                variant="danger"
            />
        </div>
    );
};

export default MenuManagement;

