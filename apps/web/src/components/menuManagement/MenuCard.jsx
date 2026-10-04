import React from 'react';
import { Edit2, Tag, XCircle, CheckCircle2, Trash2, UtensilsCrossed } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import OptimizedImage from '../common/OptimizedImage';

const MenuCard = ({ item, onEdit, onRecipe, onDelete, onToggleAvailability, userRole }) => {
    return (
        <div className="mm-card animate-fade">
            <div className="mm-img-container">
                {item.image ? (
                    <OptimizedImage
                        src={item.image}
                        alt={item.name}
                        style={{ opacity: item.available ? 1 : 0.6 }}
                    />
                ) : (
                    <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)', 
                        borderBottom: '1px solid var(--border)',
                        opacity: item.available ? 1 : 0.6,
                        gap: '1rem'
                    }}>
                        <UtensilsCrossed size={48} strokeWidth={1} color="var(--primary)" style={{ opacity: 0.4 }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>NO IMAGE</span>
                    </div>
                )}
                <div className={`mm-badge ${item.available ? 'available' : 'unavailable'}`}>
                    {item.available ? 'In Stock' : 'Out of Stock'}
                </div>
                <div className="mm-price-tag">
                    {formatCurrency(item.price)}
                </div>
            </div>

            <div className="mm-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="mm-category-label">{item.category?.name}</span>
                </div>
                <h3 className="mm-title">{item.name}</h3>
                <p className="mm-desc">
                    {item.description || 'No description available for this delicious dish.'}
                </p>

                {userRole !== 'WAITER' && (
                    <div className="mm-actions-overlay">
                        <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="mm-action-btn"
                            title="Edit dish"
                            aria-label={`Edit ${item.name}`}
                        >
                            <Edit2 size={16} strokeWidth={2.5} />
                            <span>Edit</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onRecipe(item)}
                            className="mm-action-btn primary"
                            title="Manage recipe"
                            aria-label={`Manage recipe for ${item.name}`}
                        >
                            <Tag size={16} strokeWidth={2.5} />
                            <span>Recipe</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onToggleAvailability(item)}
                            className={`mm-action-btn mm-availability-btn ${item.available ? 'available' : 'unavailable'}`}
                            title={item.available ? 'Mark Out of Stock' : 'Mark In Stock'}
                            aria-label={item.available ? `Mark ${item.name} out of stock` : `Mark ${item.name} in stock`}
                            aria-pressed={!item.available}
                        >
                            {item.available ? <XCircle size={18} strokeWidth={2.5} /> : <CheckCircle2 size={18} strokeWidth={2.5} />}
                            <span>{item.available ? 'Stock' : 'Sold out'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            className="mm-action-btn danger mm-delete-btn"
                            title="Delete dish"
                            aria-label={`Delete ${item.name}`}
                        >
                            <Trash2 size={16} strokeWidth={2.5} />
                            <span>Delete</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MenuCard;
