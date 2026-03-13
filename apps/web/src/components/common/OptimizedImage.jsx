import React, { useState, useEffect } from 'react';
import { Loader2, Image as ImageIcon } from 'lucide-react';

const OptimizedImage = ({ src, alt, style, className }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    // URL Normalization Helper
    const getOptimizedUrl = (url) => {
        if (!url) return null;
        
        let finalUrl = url;

        // Handle relative paths from backend
        // Backend URLs usually don't start with http, data:, or a double slash //
        // Also ensure we don't prepend to local Vite assets (usually starting with /src or /assets)
        if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/') && !url.startsWith('blob:')) {
            finalUrl = `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
        }

        if (!finalUrl.includes('cloudinary.com')) return finalUrl;

        // Insert optimization parameters after /upload/
        if (finalUrl.includes('/upload/')) {
            return finalUrl.replace('/upload/', '/upload/f_auto,q_auto,w_auto,c_limit/');
        }
        return finalUrl;
    };

    const optimizedSrc = getOptimizedUrl(src);

    // If no src provided, handle as error/placeholder immediately
    useEffect(() => {
        if (!src) {
            setError(true);
        } else {
            setError(false);
            setLoaded(false);
        }
    }, [src]);

    return (
        <div 
            style={{ 
                ...style, 
                position: 'relative', 
                overflow: 'hidden', 
                backgroundColor: 'rgba(255,255,255,0.03)',
                width: '100%',
                height: '100%'
            }} 
            className={className}
        >
            {/* Skeleton / Placeholder */}
            {!loaded && !error && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite linear'
                }}>
                    <Loader2 className="animate-spin" size={20} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                </div>
            )}

            {/* Error State / Placeholder */}
            {error ? (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-muted)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: style?.borderRadius || 'inherit'
                }}>
                    <div style={{
                        padding: '1rem',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <ImageIcon size={28} style={{ opacity: 0.15 }} />
                    </div>
                </div>
            ) : (
                <img
                    src={optimizedSrc}
                    alt={alt}
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                    style={{
                        ...style,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: loaded ? 1 : 0,
                        transition: 'opacity 0.5s ease-in-out',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                />
            )}

            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
};

export default OptimizedImage;
