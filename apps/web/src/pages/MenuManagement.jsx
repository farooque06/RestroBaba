import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';
import { Search, Plus, Tag, XCircle, Loader2, Trash2, Edit2, Package, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RecipeManagement from './RecipeManagement';
import ConfirmModal from '../components/ConfirmModal';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';
import MenuCard from '../components/menuManagement/MenuCard';
import CategoryTabs from '../components/menuManagement/CategoryTabs';
import Dropdown from '../components/common/Dropdown';

const MenuManagement = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedItemForRecipe, setSelectedItemForRecipe] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: () => { } });
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    // Form States
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', categoryId: '', image: '', variants: [] });
    const [newCategory, setNewCategory] = useState({ name: '', station: 'Kitchen' });
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [rawCategories, setRawCategories] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [linkedInventoryId, setLinkedInventoryId] = useState('');
    const [showQuickAddInventory, setShowQuickAddInventory] = useState(false);
    const [quickInventory, setQuickInventory] = useState({ name: '', unit: 'pcs', quantity: 0 });
    const [uploadingImg, setUploadingImg] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [categoryViewMode, setCategoryViewMode] = useState(localStorage.getItem('mmCategoryViewMode') || 'classic');
    const observerLoader = useRef(null);

    useEffect(() => {
        fetchMenuData();
    }, []);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesCategory = selectedCategory === 'All' || item.category.name === selectedCategory;
            const matchesSearch = item.name.toLowerCase().includes(debouncedSearch.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [items, selectedCategory, debouncedSearch]);

    const displayItems = filteredItems.slice(0, visibleCount);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setVisibleCount(20); // Reset visible count on search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Infinite Scroll Observer
    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '20px',
            threshold: 0.1
        };

        const handleObserver = (entities) => {
            const target = entities[0];
            if (target.isIntersecting && filteredItems.length > visibleCount) {
                setVisibleCount(prev => prev + 20);
            }
        };

        const observer = new IntersectionObserver(handleObserver, options);
        if (observerLoader.current) {
            observer.observe(observerLoader.current);
        }

        return () => {
            if (observerLoader.current) observer.unobserve(observerLoader.current);
        };
    }, [filteredItems.length, visibleCount]);

    const fetchMenuData = async () => {
        setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const fetchPromises = [
                fetch(`${API_BASE_URL}/api/menu/items`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/menu/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
            ];

            // Waiters cannot access inventory, so don't fetch it
            if (user?.role !== 'WAITER') {
                fetchPromises.push(
                    fetch(`${API_BASE_URL}/api/inventory`, { headers: { 'Authorization': `Bearer ${token}` } })
                );
            }

            const responses = await Promise.all(fetchPromises);
            const itemsRes = responses[0];
            const catsRes = responses[1];
            const invRes = responses[2]; // Will be undefined for Waiters

            if (itemsRes.ok && catsRes.ok && (!invRes || invRes.ok)) {
                const itemsData = await itemsRes.json();
                const catsData = await catsRes.json();

                setItems(itemsData);
                setRawCategories(catsData);
                setCategories(['All', ...catsData.map(c => c.name)]);

                if (invRes) {
                    const invData = await invRes.json();
                    setInventoryItems(invData);
                }
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
            image: item.image || '',
            variants: item.variants || []
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
                setNewItem({ name: '', description: '', price: '', categoryId: '', image: '', variants: [] });
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
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Menu Management</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Curate your culinary offerings for <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{user?.clientName}</span></p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {user?.role !== 'WAITER' && (
                        <>
                            <button
                                onClick={() => {
                                    setNewCategory({ name: '', station: 'Kitchen' });
                                    setEditingCategoryId(null);
                                    setIsCategoryModalOpen(true);
                                }}
                                className="nav-item"
                                style={{ border: '1px solid var(--glass-border)', background: 'var(--glass-shine)', color: 'var(--text-main)', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
                            >
                                <Tag size={20} />
                                <span>Manage Categories</span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditingItem(null);
                                    setNewItem({ name: '', description: '', price: '', categoryId: '', image: '', variants: [] });
                                    setIsItemModalOpen(true);
                                }}
                                className="nav-item active"
                                style={{ border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
                            >
                                <Plus size={20} />
                                <span>Add New Item</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: '3rem', justifyContent: 'space-between' }}>
                <CategoryTabs 
                    categories={categories} 
                    selectedCategory={selectedCategory} 
                    onSelect={setSelectedCategory} 
                    viewMode={categoryViewMode}
                />
                
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0.35rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <button
                            onClick={() => {
                                const newMode = categoryViewMode === 'classic' ? 'smart' : 'classic';
                                setCategoryViewMode(newMode);
                                localStorage.setItem('mmCategoryViewMode', newMode);
                            }}
                            style={{ 
                                background: categoryViewMode === 'smart' ? 'var(--primary)' : 'transparent', 
                                color: categoryViewMode === 'smart' ? 'white' : 'var(--text-muted)', 
                                border: 'none', 
                                padding: '0 1rem',
                                height: '40px',
                                borderRadius: '10px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            title="Switch Category Navigation"
                        >
                            <LayoutGrid size={18} strokeWidth={2.5} />
                            <span>{categoryViewMode === 'classic' ? 'CLASSIC' : 'SMART NAV'}</span>
                        </button>
                    </div>
                    <div style={{ display: 'flex', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0.35rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{ 
                                background: viewMode === 'grid' ? 'var(--primary)' : 'transparent', 
                                color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', 
                                border: 'none', 
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: viewMode === 'grid' ? '0 4px 12px var(--primary-glow)' : 'none'
                            }}
                            title="Grid View"
                        >
                            <LayoutGrid size={20} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{ 
                                background: viewMode === 'list' ? 'var(--primary)' : 'transparent', 
                                color: viewMode === 'list' ? 'white' : 'var(--text-muted)', 
                                border: 'none', 
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: viewMode === 'list' ? '0 4px 12px var(--primary-glow)' : 'none'
                            }}
                            title="List View"
                        >
                            <List size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                    <div className="mm-search-bar">
                        <Search size={20} strokeWidth={2.5} color="var(--primary)" />
                        <input
                            type="text"
                            placeholder="Find a dish (e.g. Burger, Momo...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div className={`mm-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
                {displayItems.map(item => (
                    <MenuCard
                        key={item.id}
                        item={item}
                        onEdit={openEditItem}
                        onRecipe={setSelectedItemForRecipe}
                        onDelete={deleteItem}
                        onToggleAvailability={toggleAvailability}
                        userRole={user?.role}
                    />
                ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={observerLoader} style={{ height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' }}>
                {filteredItems.length > visibleCount && (
                    <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                )}
            </div>

            {isItemModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }} className="animate-fade">
                    <div className="premium-glass" style={{ width: '100%', maxWidth: '550px', padding: '2.5rem', borderRadius: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button 
                            onClick={() => setIsItemModalOpen(false)}
                            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <XCircle size={24} />
                        </button>

                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
                            {editingItem ? 'Edit Dish' : 'New Dish'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                            {editingItem ? 'Update the details of your menu item.' : 'Add a new culinary masterpiece to your menu.'}
                        </p>

                        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>ITEM NAME</label>
                                <input
                                    className="mm-search-input"
                                    style={{ paddingLeft: '1.5rem', borderRadius: '12px' }}
                                    placeholder="Enter dish name..."
                                    required
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>DESCRIPTION</label>
                                <textarea
                                    className="mm-search-input"
                                    style={{ paddingLeft: '1.5rem', borderRadius: '12px', minHeight: '100px', resize: 'none', paddingTop: '10px' }}
                                    placeholder="Describe the flavors, ingredients..."
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>PRICE</label>
                                    <input
                                        className="mm-search-input"
                                        style={{ paddingLeft: '1.5rem', borderRadius: '12px' }}
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        required
                                        value={newItem.price}
                                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <Dropdown 
                                        label="CATEGORY"
                                        placeholder="Select Category"
                                        isSearchable={true}
                                        options={rawCategories.map(cat => ({ value: cat.id, label: cat.name }))}
                                        value={newItem.categoryId}
                                        onChange={val => setNewItem({ ...newItem, categoryId: val })}
                                    />
                                </div>
                            </div>

                            {/* VARIANTS SECTION */}
                            <div style={{
                                padding: '1.25rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '16px',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <List size={16} color="var(--primary)" />
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>VARIANTS & SIZES (OPTIONAL)</label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVariants = [...(newItem.variants || [])];
                                            newVariants.push({ name: '', price: '' });
                                            setNewItem({ ...newItem, variants: newVariants });
                                        }}
                                        style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase' }}
                                    >
                                        + Add Variant
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {(newItem.variants || []).map((variant, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="animate-fade">
                                            <input
                                                className="mm-search-input"
                                                style={{ paddingLeft: '1rem', borderRadius: '10px', flex: 2, height: '40px' }}
                                                placeholder="e.g. 30ml / Full"
                                                value={variant.name}
                                                onChange={e => {
                                                    const newVariants = [...newItem.variants];
                                                    newVariants[idx].name = e.target.value;
                                                    setNewItem({ ...newItem, variants: newVariants });
                                                }}
                                            />
                                            <input
                                                className="mm-search-input"
                                                style={{ paddingLeft: '1rem', borderRadius: '10px', flex: 1, height: '40px' }}
                                                type="number"
                                                placeholder="Price"
                                                value={variant.price}
                                                onChange={e => {
                                                    const newVariants = [...newItem.variants];
                                                    newVariants[idx].price = e.target.value;
                                                    setNewItem({ ...newItem, variants: newVariants });
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVariants = newItem.variants.filter((_, i) => i !== idx);
                                                    setNewItem({ ...newItem, variants: newVariants });
                                                }}
                                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.7 }}
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!newItem.variants || newItem.variants.length === 0) && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.5rem 0' }}>
                                            No variants added. Base price will be used.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                width: '100%',
                                padding: '2rem',
                                border: '2px dashed var(--border)',
                                borderRadius: '16px',
                                textAlign: 'center',
                                background: 'rgba(255,255,255,0.02)',
                                transition: 'all 0.3s ease'
                            }} onDragOver={e => e.preventDefault()}>
                                {uploadingImg ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Uploading image...</span>
                                    </div>
                                ) : newItem.image ? (
                                    <div style={{ position: 'relative', width: '100%', height: '150px' }}>
                                        <img src={newItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                                        <button
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, image: '' })}
                                            style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label style={{ cursor: 'pointer', display: 'block' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--glass-shine)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Plus size={24} color="var(--primary)" />
                                            </div>
                                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Upload Photo</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drag and drop or click to browse</span>
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    </label>
                                )}
                            </div>

                            <div style={{
                                padding: '1.25rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '16px',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Package size={16} color="var(--primary)" />
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>INVENTORY LINKING</label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickAddInventory(!showQuickAddInventory)}
                                        style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase' }}
                                    >
                                        {showQuickAddInventory ? 'Cancel' : '+ New Stock Item'}
                                    </button>
                                </div>

                                {!showQuickAddInventory ? (
                                    <Dropdown 
                                        placeholder="-- No Tracking (Service Item) --"
                                        isSearchable={true}
                                        options={inventoryItems.map(inv => ({ 
                                            value: inv.id, 
                                            label: `${inv.name} (${inv.quantity} ${inv.unit})` 
                                        }))}
                                        value={linkedInventoryId}
                                        onChange={setLinkedInventoryId}
                                    />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="animate-fade">
                                        <input
                                            className="mm-search-input"
                                            style={{ paddingLeft: '1.5rem', borderRadius: '12px' }}
                                            placeholder="Stock name (e.g. Cola 300ml)"
                                            value={quickInventory.name}
                                            onChange={e => setQuickInventory({ ...quickInventory, name: e.target.value })}
                                        />
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <input
                                                className="mm-search-input"
                                                style={{ paddingLeft: '1.5rem', borderRadius: '12px', flex: 1 }}
                                                type="number"
                                                placeholder="Initial Qty"
                                                value={quickInventory.quantity}
                                                onChange={e => setQuickInventory({ ...quickInventory, quantity: e.target.value })}
                                            />
                                            <input
                                                className="mm-search-input"
                                                style={{ paddingLeft: '1.5rem', borderRadius: '12px', flex: 1 }}
                                                placeholder="Unit (pcs/kg)"
                                                value={quickInventory.unit}
                                                onChange={e => setQuickInventory({ ...quickInventory, unit: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="mm-action-btn" style={{ flex: 1, height: '48px' }}>Cancel</button>
                                <button type="submit" className="mm-category-pill active" style={{ flex: 2, height: '48px', border: 'none' }}>
                                    {editingItem ? 'Update Dish' : 'Create Dish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {isCategoryModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }} className="animate-fade">
                    <div className="premium-glass" style={{ width: '100%', maxWidth: '600px', borderRadius: '24px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>Categories</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Organize your menu for better guest discovery.</p>
                            </div>
                            <button 
                                onClick={() => setIsCategoryModalOpen(false)}
                                style={{ background: 'var(--glass-shine)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCategory} style={{ marginBottom: '2.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: '1rem', alignItems: 'flex-end' }}>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>CATEGORY NAME</label>
                                    <input
                                        className="mm-search-input"
                                        style={{ paddingLeft: '1.25rem', height: '44px', borderRadius: '10px' }}
                                        placeholder="Appetizers, Desserts..."
                                        required
                                        value={newCategory.name}
                                        onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <Dropdown 
                                        label="STATION"
                                        options={[
                                            { value: 'Kitchen', label: 'Kitchen' },
                                            { value: 'Bar', label: 'Bar' },
                                            { value: 'Pizzeria', label: 'Pizzeria' },
                                            { value: 'Bakery', label: 'Bakery' },
                                        ]}
                                        value={newCategory.station}
                                        onChange={val => setNewCategory({ ...newCategory, station: val })}
                                    />
                                </div>
                                <button type="submit" className="mm-category-pill active" style={{ height: '44px', border: 'none', padding: 0 }}>
                                    {editingCategoryId ? 'Save' : 'Add'}
                                </button>
                            </div>
                        </form>

                        <div>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem' }}>CURRENT CATEGORIES</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                                {rawCategories.map(cat => (
                                    <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', transition: 'all 0.2s ease' }} className="mm-category-item-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)' }}></div>
                                            <div>
                                                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{cat.name}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Routing: {cat.station || 'Kitchen'}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => {
                                                    setEditingCategoryId(cat.id);
                                                    setNewCategory({ name: cat.name, station: cat.station || 'Kitchen' });
                                                }}
                                                className="mm-action-btn"
                                                style={{ width: '40px', padding: 0 }}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                className="mm-action-btn danger"
                                                style={{ width: '40px', padding: 0 }}
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
                    </div>
                </div>,
                document.body
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

