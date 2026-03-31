import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * Artisan Premium Dropdown
 * 
 * @param {Array} options - List of { value, label } or strings
 * @param {any} value - Currently selected value
 * @param {Function} onChange - Callback when value changes
 * @param {string} placeholder - Default text
 * @param {string} label - Optional label above dropdown
 * @param {boolean} isSearchable - Enable internal search filter
 */
const Dropdown = ({ 
    options = [], 
    value, 
    onChange, 
    placeholder = 'Select an option', 
    label,
    isSearchable = false,
    className = "",
    style = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Normalize options to { value, label }
    const normalizedOptions = options.map(opt => 
        typeof opt === 'object' ? opt : { value: opt, label: opt }
    );

    const selectedOption = normalizedOptions.find(opt => opt.value === value);

    const filteredOptions = normalizedOptions.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`dropdown-container ${className}`} style={{ position: 'relative', width: '100%', ...style }} ref={dropdownRef}>
            {label && (
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </label>
            )}

            <div 
                className={`dropdown-trigger premium-glass ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border)'}`,
                    boxShadow: isOpen ? '0 0 15px var(--primary-glow)' : 'none',
                    background: 'var(--bg-input)'
                }}
            >
                <span style={{ 
                    color: selectedOption ? 'var(--text-main)' : 'var(--text-muted)', 
                    fontSize: '0.9rem',
                    fontWeight: selectedOption ? 600 : 400
                }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: 'flex', alignItems: 'center', color: isOpen ? 'var(--primary)' : 'var(--text-muted)' }}
                >
                    <ChevronDown size={18} />
                </motion.div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="premium-glass dropdown-menu"
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 2000,
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            backdropFilter: 'blur(15px)'
                        }}
                    >
                        {isSearchable && (
                            <div className="dropdown-search" style={{ 
                                padding: '0.75rem', 
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(0,0,0,0.1)'
                            }}>
                                <Search size={14} color="var(--text-muted)" />
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder="Keywords..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'none',
                                        border: 'none',
                                        outline: 'none',
                                        color: 'var(--text-main)',
                                        fontSize: '0.85rem'
                                    }}
                                />
                                {searchTerm && (
                                    <X 
                                        size={14} 
                                        color="var(--text-muted)" 
                                        style={{ cursor: 'pointer' }} 
                                        onClick={() => setSearchTerm('')} 
                                    />
                                )}
                            </div>
                        )}

                        <div className="dropdown-options" style={{ 
                            maxHeight: '250px', 
                            overflowY: 'auto',
                            padding: '0.5rem'
                        }}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, idx) => (
                                    <div
                                        key={opt.value || idx}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className={`dropdown-option ${value === opt.value ? 'selected' : ''}`}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderRadius: '10px',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: value === opt.value ? 'var(--primary-glow)' : 'transparent',
                                            color: value === opt.value ? 'var(--primary)' : 'var(--text-main)',
                                            fontWeight: value === opt.value ? 700 : 400,
                                            borderLeft: value === opt.value ? '3px solid var(--primary)' : '3px solid transparent',
                                            marginBottom: '2px'
                                        }}
                                        onMouseEnter={e => {
                                            if (value !== opt.value) {
                                                e.currentTarget.style.background = 'var(--bg-card-hover)';
                                                e.currentTarget.style.color = 'var(--text-heading)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (value !== opt.value) {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = 'var(--text-main)';
                                            }
                                        }}
                                    >
                                        {opt.label}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    No matches found.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dropdown;
