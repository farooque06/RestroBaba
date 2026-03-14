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
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        background: 'var(--glass-shine)', 
                        borderBottom: '1px solid var(--border)',
                        opacity: item.available ? 1 : 0.6
                    }}>
                        <UtensilsCrossed size={48} color="var(--text-muted)" style={{ opacity: 0.3 }} />
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
                <span className="mm-category-label">{item.category?.name}</span>
                <h3 className="mm-title">{item.name}</h3>
                <p className="mm-desc">
                    {item.description || 'No description available for this delicious dish.'}
                </p>

                {userRole !== 'WAITER' && (
                    <div className="mm-actions-overlay">
                        <button onClick={() => onEdit(item)} className="mm-action-btn" title="Edit Item">
                            <Edit2 size={16} />
                            <span>Edit</span>
                        </button>
                        <button onClick={() => onRecipe(item)} className="mm-action-btn primary" title="Manage Recipe">
                            <Tag size={16} />
                            <span>Recipe</span>
                        </button>
                        <button
                            onClick={() => onToggleAvailability(item)}
                            className="mm-action-btn"
                            style={{ color: item.available ? 'var(--danger)' : 'var(--success)' }}
                            title={item.available ? 'Disable Item' : 'Enable Item'}
                        >
                            {item.available ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        <button onClick={() => onDelete(item.id)} className="mm-action-btn danger" title="Delete Item">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MenuCard;
