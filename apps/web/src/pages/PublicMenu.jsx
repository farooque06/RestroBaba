import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { Utensils, Search, Loader2, Star, Award, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import OptimizedImage from '../components/common/OptimizedImage';

const PublicMenu = () => {
    const { clientId, tableId } = useParams();
    const [menuItems, setMenuItems] = useState([]);
    const [clientInfo, setClientInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                const [menuRes, clientRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/public/menu/${clientId}`),
                    fetch(`${API_BASE_URL}/api/public/client-info/${clientId}`)
                ]);

                if (menuRes.ok) setMenuItems(await menuRes.json());
                if (clientRes.ok) setClientInfo(await clientRes.json());
            } catch (err) {
                console.error('Failed to fetch public menu data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPublicData();
    }, [clientId]);

    const categories = ['All', ...new Set(menuItems.map(item => item.category))];
    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0b' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{
                height: '220px',
                background: 'linear-gradient(rgba(0,0,0,0.4), #0a0a0b), url("https://images.unsplash.com/photo-1514516348921-f23902ee4078?q=80&w=2070&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ padding: '0.4rem', background: 'var(--primary)', borderRadius: '8px' }}>
                        <Utensils size={20} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{clientInfo?.name || 'RestroFlow Menu'}</h1>
                </div>
                {tableId && <p style={{ color: 'var(--primary)', fontWeight: 700 }}>Table {tableId}</p>}
                <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>Welcome to our premium dining experience.</p>
            </div>

            {/* Sticky Search & Filter */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(10, 10, 11, 0.8)', backdropFilter: 'blur(20px)', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                    <input
                        type="text"
                        placeholder="Search our delicious dishes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.8rem 1rem 0.8rem 2.8rem',
                            background: '#151517',
                            border: '1px solid #222',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            style={{
                                padding: '0.6rem 1.2rem',
                                borderRadius: '10px',
                                background: selectedCategory === cat ? 'var(--primary)' : '#151517',
                                border: '1px solid' + (selectedCategory === cat ? 'var(--primary)' : '#222'),
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu List */}
            <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
                {filteredItems.map(item => (
                    <div key={item.id} className="premium-glass" style={{
                        padding: '1rem',
                        borderRadius: '16px',
                        display: 'flex',
                        gap: '1rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)'
                    }}>
                        <div style={{ position: 'relative' }}>
                            <OptimizedImage
                                src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1760&auto=format&fit=crop'}
                                alt={item.name}
                                style={{ width: '100px', height: '100px', borderRadius: '12px' }}
                            />
                            {Math.random() > 0.7 && (
                                <div style={{ position: 'absolute', top: '-5px', left: '-5px', background: 'var(--primary)', padding: '4px', borderRadius: '50%' }}>
                                    <Star size={10} color="white" fill="white" />
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{item.name}</h3>
                                <div style={{ background: 'rgba(255,255,0,0.05)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', color: '#ffd700', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Award size={10} />
                                    <span>Special</span>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#777', marginBottom: '0.75rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {item.description || 'Artisanally prepared with the finest ingredients and spices for an authentic taste experience.'}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(item.price)}</span>
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                                    <ChevronRight size={18} color="#444" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#555' }}>
                        <Utensils size={40} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                        <p>No dishes found in this category.</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#444', fontSize: '0.75rem' }}>
                <p>© 2024 {clientInfo?.name} · Powered by RestroFlow</p>
            </div>
        </div>
    );
};

export default PublicMenu;
