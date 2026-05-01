import React from 'react';
import Dropdown from '../common/Dropdown';

const CategoryTabs = ({ categories, selectedCategory, onSelect, viewMode = 'classic' }) => {
    // Mode Logic: Only use smart switcher if mode is 'smart' AND list is long
    const isSmartMode = viewMode === 'smart' && categories.length > 8;

    if (!isSmartMode) {
        return (
            <div className="mm-category-nav" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => onSelect(cat)}
                        className={`mm-category-pill ${selectedCategory === cat ? 'active' : ''}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        );
    }

    // Logic for SMART lists: "All Dishes" chip + SHOWING chip + Searchable Dropdown
    return (
        <div className="mm-category-nav" style={{ overflow: 'visible', alignItems: 'center', gap: '1rem' }}>
            <button
                onClick={() => onSelect('All')}
                className={`mm-category-pill ${selectedCategory === 'All' ? 'active' : ''}`}
            >
                All Dishes
            </button>

            {selectedCategory !== 'All' && (
                <div className="animate-fade" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>SHOWING</span>
                    <button className="mm-category-pill active">
                        {selectedCategory}
                    </button>
                </div>
            )}

            <div style={{ width: '220px' }}>
                <Dropdown
                    placeholder="Find Category..."
                    isSearchable={true}
                    options={categories.filter(c => c !== 'All')}
                    value={selectedCategory === 'All' ? '' : selectedCategory}
                    onChange={onSelect}
                    style={{ background: 'var(--bg-input)', height: '40px' }}
                />
            </div>
        </div>
    );
};

export default CategoryTabs;
