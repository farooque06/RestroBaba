import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';
import { Search, Plus, Tag, XCircle, Loader2, Trash2, Edit2, Package, LayoutGrid, List, Image as ImageIcon, Layers, Boxes, ChevronRight, ListFilter, UtensilsCrossed } from 'lucide-react';
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
                toast.success(`Item marked ${!item.available ? 'Available' : 'Unavailable'}`);
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
                toast.success('Item deleted successfully');
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
                toast.success('Image uploaded successfully');
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
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)' }}>Curating your menu...</p>
        </div>
    );

    if (selectedItemForRecipe) {
        return <RecipeManagement menuItem={selectedItemForRecipe} onBack={() => setSelectedItemForRecipe(null)} />;
    }

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.4rem' }}>Menu Management</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', fontWeight: 500 }}>Curating artisan culinary offerings for <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{user?.clientName}</span></p>
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
                                style={{ border: '1px solid var(--glass-border)', background: 'var(--glass-shine)', color: 'var(--text-main)', display: 'flex', gap: '0.65rem', alignItems: 'center', padding: '0.85rem 1.75rem', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s ease' }}
                            >
                                <Tag size={20} strokeWidth={2.5} color="var(--primary)" />
                                <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.02em' }}>CATEGORIES</span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditingItem(null);
                                    setNewItem({ name: '', description: '', price: '', categoryId: '', image: '', variants: [] });
                                    setIsItemModalOpen(true);
                                }}
                                className="nav-item active"
                                style={{ border: 'none', display: 'flex', gap: '0.65rem', alignItems: 'center', padding: '0.85rem 1.75rem', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 8px 25px var(--primary-glow)' }}
                            >
                                <Plus size={20} strokeWidth={3} />
                                <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.02em' }}>ADD DISH</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: '3.5rem', justifyContent: 'space-between' }}>
                <CategoryTabs
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelect={setSelectedCategory}
                    viewMode={categoryViewMode}
                />

                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '0.35rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <button
                            onClick={() => {
                                const newMode = categoryViewMode === 'classic' ? 'smart' : 'classic';
                                setCategoryViewMode(newMode);
                                localStorage.setItem('mmCategoryViewMode', newMode);
                            }}
                            className={categoryViewMode === 'smart' ? 'tm-chip active' : 'tm-chip'}
                            style={{
                                background: categoryViewMode === 'smart' ? 'var(--primary)' : 'transparent',
                                color: categoryViewMode === 'smart' ? 'black' : 'var(--text-muted)',
                                border: 'none',
                                padding: '0 1.25rem',
                                height: '42px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
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
                    <div style={{ display: 'flex', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '0.35rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={viewMode === 'grid' ? 'tm-chip active' : 'tm-chip'}
                            style={{
                                background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                                color: viewMode === 'grid' ? 'black' : 'var(--text-muted)',
                                border: 'none',
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            title="Grid View"
                        >
                            <LayoutGrid size={20} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={viewMode === 'list' ? 'tm-chip active' : 'tm-chip'}
                            style={{
                                background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                                color: viewMode === 'list' ? 'black' : 'var(--text-muted)',
                                border: 'none',
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            title="List View"
                        >
                            <List size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                    <div className="mm-search-bar" style={{ height: '52px', borderRadius: '16px' }}>
                        <Search size={22} strokeWidth={2.5} color="var(--primary)" />
                        <input
                            type="text"
                            placeholder="Find a culinary masterpiece..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ fontSize: '1rem' }}
                        />
                    </div>
                </div>
            </div>

            {error && <div className="error-message" style={{ marginBottom: '1.5rem' }}>{error}</div>}

            <div className={`mm-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
                {displayItems.length > 0 ? displayItems.map(item => (
                    <MenuCard
                        key={item.id}
                        item={item}
                        onEdit={openEditItem}
                        onRecipe={setSelectedItemForRecipe}
                        onDelete={deleteItem}
                        onToggleAvailability={toggleAvailability}
                        userRole={user?.role}
                    />
                )) : (
                    <div className="flex-center" style={{ gridColumn: '1 / -1', padding: '5rem 0', opacity: 0.5 }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>No items found in this category.</span>
                    </div>
                )}
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={observerLoader} style={{ height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2rem' }}>
                {filteredItems.length > visibleCount && (
                    <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                )}
            </div>

            {isItemModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(15px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }} className="animate-fade">
                    <div className="premium-glass" style={{ width: '100%', maxWidth: '620px', padding: '3rem', borderRadius: '32px', position: 'relative', maxHeight: '92vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setIsItemModalOpen(false)}
                            style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}
                        >
                            <XCircle size={24} strokeWidth={2.5} />
                        </button>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>
                                {editingItem ? 'Refine Dish' : 'New Creation'}
                            </h2>
                            <div style={{ height: '3px', width: '60px', background: 'var(--primary)', borderRadius: '10px' }}></div>
                        </div>

                        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                            {/* BASIC INFO */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.65rem', display: 'block', letterSpacing: '0.05em' }}>ITEM NAME</label>
                                    <input
                                        className="mm-search-input"
                                        style={{ paddingLeft: '1.5rem', borderRadius: '14px', height: '54px', fontSize: '1.05rem', background: 'rgba(255,255,255,0.02)' }}
                                        placeholder="Artisanal Dish Name..."
                                        required
                                        value={newItem.name}
                                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    />
                                </div>

                                <div className="input-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.65rem', display: 'block', letterSpacing: '0.05em' }}>DESCRIPTION</label>
                                    <textarea
                                        className="mm-search-input"
                                        style={{ padding: '1.25rem 1.5rem', borderRadius: '14px', minHeight: '110px', resize: 'none', fontSize: '0.95rem', background: 'rgba(255,255,255,0.02)', lineHeight: '1.6' }}
                                        placeholder="Describe the flavors, secrets, and preparation..."
                                        value={newItem.description}
                                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div className="input-group">
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.65rem', display: 'block', letterSpacing: '0.05em' }}>BASE PRICE</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className="mm-search-input"
                                                style={{ paddingLeft: '1.5rem', borderRadius: '14px', height: '54px', fontSize: '1.05rem', background: 'rgba(255,255,255,0.02)' }}
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                required
                                                value={newItem.price}
                                                onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <Dropdown
                                            label="MENU CATEGORY"
                                            placeholder="Select Category"
                                            isSearchable={true}
                                            options={rawCategories.map(cat => ({ value: cat.id, label: cat.name }))}
                                            value={newItem.categoryId}
                                            onChange={val => setNewItem({ ...newItem, categoryId: val })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* VARIANTS SECTION */}
                            <div style={{
                                padding: '1.75rem',
                                background: 'rgba(255,255,255,0.01)',
                                borderRadius: '22px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderLeft: '4px solid var(--primary)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                        <Layers size={18} color="var(--primary)" strokeWidth={2.5} />
                                        <label style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-heading)' }}>Variants & Portions</label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVariants = [...(newItem.variants || [])];
                                            newVariants.push({ name: '', price: '' });
                                            setNewItem({ ...newItem, variants: newVariants });
                                        }}
                                        style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'var(--glass-shine)', padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 800, transition: 'all 0.3s ease' }}
                                    >
                                        + Add Item
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    {(newItem.variants || []).map((variant, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }} className="animate-fade">
                                            <div style={{ flex: 2, position: 'relative' }}>
                                                <input
                                                    className="mm-search-input"
                                                    style={{ paddingLeft: '1.25rem', borderRadius: '12px', height: '44px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.03)' }}
                                                    placeholder="Small, 30ml, Glass..."
                                                    value={variant.name}
                                                    onChange={e => {
                                                        const newVariants = [...newItem.variants];
                                                        newVariants[idx].name = e.target.value;
                                                        setNewItem({ ...newItem, variants: newVariants });
                                                    }}
                                                />
                                            </div>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <input
                                                    className="mm-search-input"
                                                    style={{ paddingLeft: '1.25rem', borderRadius: '12px', height: '44px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.03)' }}
                                                    type="number"
                                                    placeholder="Price"
                                                    value={variant.price}
                                                    onChange={e => {
                                                        const newVariants = [...newItem.variants];
                                                        newVariants[idx].price = e.target.value;
                                                        setNewItem({ ...newItem, variants: newVariants });
                                                    }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVariants = newItem.variants.filter((_, i) => i !== idx);
                                                    setNewItem({ ...newItem, variants: newVariants });
                                                }}
                                                style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', cursor: 'pointer', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!newItem.variants || newItem.variants.length === 0) && (
                                        <div style={{ textAlign: 'center', padding: '1rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>No variants defined. Using single base price.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ARTWORK / IMAGE UPLOAD */}
                            <div style={{
                                padding: '1.5rem',
                                background: 'rgba(255,255,255,0.01)',
                                borderRadius: '22px',
                                border: '1px dashed rgba(255,255,255,0.1)',
                                textAlign: 'center',
                                transition: 'all 0.3s ease'
                            }} onDragOver={e => e.preventDefault()}>
                                {uploadingImg ? (
                                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                                        <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 800 }}>Masterpiece Processing...</span>
                                    </div>
                                ) : newItem.image ? (
                                    <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                                        <img src={newItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} />
                                        <button
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, image: '' })}
                                            style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', transition: 'transform 0.2s ease' }}
                                            className="hover-scale"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label style={{ cursor: 'pointer', display: 'block', padding: '2.5rem 0' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'var(--glass-shine)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                                                <ImageIcon size={30} color="var(--primary)" strokeWidth={1.5} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-heading)' }}>Dish Artwork</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>High-resolution PNG, JPG (Max 5MB)</span>
                                            </div>
                                            <div style={{ padding: '0.5rem 1.25rem', background: 'var(--primary)', color: 'black', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 900, marginTop: '0.5rem' }}>UPLOAD PHOTO</div>
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    </label>
                                )}
                            </div>

                            {/* INVENTORY TRACKING */}
                            <div style={{
                                padding: '1.75rem',
                                background: 'rgba(255,255,255,0.01)',
                                borderRadius: '22px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderLeft: '4px solid #3b82f6'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                        <Boxes size={18} color="#3b82f6" strokeWidth={2.5} />
                                        <label style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-heading)' }}>Stock Intelligence</label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickAddInventory(!showQuickAddInventory)}
                                        style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)', padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 800, transition: 'all 0.3s ease' }}
                                    >
                                        {showQuickAddInventory ? 'Sync Existing' : '+ New Supply'}
                                    </button>
                                </div>

                                {!showQuickAddInventory ? (
                                    <Dropdown
                                        placeholder="-- Select Supply to Track Stock (Optional) --"
                                        isSearchable={true}
                                        options={inventoryItems.map(inv => ({
                                            value: inv.id,
                                            label: `${inv.name} (${inv.quantity} ${inv.unit})`
                                        }))}
                                        value={linkedInventoryId}
                                        onChange={setLinkedInventoryId}
                                    />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade">
                                        <input
                                            className="mm-search-input"
                                            style={{ paddingLeft: '1.25rem', borderRadius: '12px', height: '48px', background: 'rgba(255,255,255,0.03)' }}
                                            placeholder="Stock Name (e.g. Avocado, Whole Milk...)"
                                            value={quickInventory.name}
                                            onChange={e => setQuickInventory({ ...quickInventory, name: e.target.value })}
                                        />
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <input
                                                className="mm-search-input"
                                                style={{ paddingLeft: '1.25rem', borderRadius: '12px', flex: 1.5, height: '48px', background: 'rgba(255,255,255,0.03)' }}
                                                type="number"
                                                placeholder="Current Qty"
                                                value={quickInventory.quantity}
                                                onChange={e => setQuickInventory({ ...quickInventory, quantity: e.target.value })}
                                            />
                                            <input
                                                className="mm-search-input"
                                                style={{ paddingLeft: '1.25rem', borderRadius: '12px', flex: 1, height: '48px', background: 'rgba(255,255,255,0.03)' }}
                                                placeholder="Unit (Kg, Pc)"
                                                value={quickInventory.unit}
                                                onChange={e => setQuickInventory({ ...quickInventory, unit: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SUBMIT ACTIONS */}
                            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem', position: 'sticky', bottom: '-10px', background: 'var(--bg-main)', padding: '1rem 0', boxShadow: '0 -20px 30px var(--bg-main)' }}>
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="mm-action-btn" style={{ flex: 1, height: '54px', borderRadius: '16px', border: '1px solid var(--border)', fontWeight: 800 }}>Discard</button>
                                <button type="submit" className="mm-category-pill active" style={{ flex: 2.2, height: '54px', border: 'none', borderRadius: '16px', fontSize: '1rem', letterSpacing: '0.05em', boxShadow: '0 10px 30px var(--primary-glow)' }}>
                                    {editingItem ? 'SYNC UPDATES' : 'PUBLISH MASTERPIECE'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {isCategoryModalOpen && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(15px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }} className="animate-fade">
                    <div className="premium-glass" style={{ width: '100%', maxWidth: '640px', borderRadius: '32px', padding: '3.5rem', maxHeight: '92vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
                            <div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-heading)', marginBottom: '0.6rem', letterSpacing: '-0.02em' }}>Organization</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>Structural grouping for your culinary catalogue.</p>
                            </div>
                            <button
                                onClick={() => setIsCategoryModalOpen(false)}
                                style={{ background: 'var(--glass-shine)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.3s ease' }}
                            >
                                <XCircle size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCategory} style={{ marginBottom: '3.5rem', background: 'rgba(255,255,255,0.01)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.8fr', gap: '1.25rem', alignItems: 'flex-end' }}>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.65rem', display: 'block', letterSpacing: '0.05em' }}>CATEGORY NAME</label>
                                    <input
                                        className="mm-search-input"
                                        style={{ paddingLeft: '1.25rem', height: '50px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}
                                        placeholder="Main Course..."
                                        required
                                        value={newCategory.name}
                                        onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <Dropdown
                                        label="STATION"
                                        options={[
                                            { value: 'Kitchen', label: 'Main Kitchen' },
                                            { value: 'Bar', label: 'Beverage Bar' },
                                            { value: 'Pizzeria', label: 'Pizzeria' },
                                            { value: 'Bakery', label: 'Bakery/Pastry' },
                                            { value: 'Tandoor', label: 'Tandoor Sec' },
                                        ]}
                                        value={newCategory.station}
                                        onChange={val => setNewCategory({ ...newCategory, station: val })}
                                    />
                                </div>
                                <button type="submit" className="mm-category-pill active" style={{ height: '50px', border: 'none', padding: 0 }}>
                                    {editingCategoryId ? 'SAVE' : 'ADD'}
                                </button>
                            </div>
                        </form>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <ListFilter size={18} color="var(--primary)" strokeWidth={2.5} />
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.06em', color: 'var(--text-heading)', textTransform: 'uppercase' }}>Structure Schema</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                {rawCategories.map(cat => (
                                    <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '18px', transition: 'all 0.3s ease' }} className="mm-category-item-row group-hover-gold">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 15px var(--primary-glow)' }}></div>
                                            <div>
                                                <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem', letterSpacing: '-0.01em' }}>{cat.name}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                    <ChevronRight size={12} color="var(--text-muted)" />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{cat.station || 'Kitchen'} Routing</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                onClick={() => {
                                                    setEditingCategoryId(cat.id);
                                                    setNewCategory({ name: cat.name, station: cat.station || 'Kitchen' });
                                                }}
                                                className="mm-action-btn"
                                                style={{ width: '44px', height: '44px', padding: 0, borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                className="mm-action-btn danger"
                                                style={{ width: '44px', height: '44px', padding: 0, borderRadius: '12px', background: 'rgba(239, 68, 68, 0.03)' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {rawCategories.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.3 }}>
                                        <UtensilsCrossed size={48} style={{ marginBottom: '1rem' }} />
                                        <p style={{ fontSize: '1rem', fontWeight: 600 }}>No categories configured.</p>
                                    </div>
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
