import React from 'react';

const CategoryTabs = ({ categories, selectedCategory, onSelect }) => {
    return (
        <div className="mm-category-nav">
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
};

export default CategoryTabs;
