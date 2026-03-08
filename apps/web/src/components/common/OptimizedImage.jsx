import React, { useState } from 'react';
import { Loader2, Image as ImageIcon } from 'lucide-react';

const OptimizedImage = ({ src, alt, style, className }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    // Cloudinary Optimization Helper
    // Adds f_auto (auto format - WebP/AVIF) and q_auto (auto quality)
    const getOptimizedUrl = (url) => {
        if (!url || !url.includes('cloudinary.com')) return url;

        // Insert optimization parameters after /upload/
        if (url.includes('/upload/')) {
            return url.replace('/upload/', '/upload/f_auto,q_auto,w_auto,c_limit/');
        }
        return url;
    };

    const optimizedSrc = getOptimizedUrl(src);

    return (
        <div style={{ ...style, position: 'relative', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' }} className={className}>
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

            {/* Error State */}
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
                    color: 'var(--text-muted)'
                }}>
                    <ImageIcon size={24} style={{ opacity: 0.2 }} />
                    <span style={{ fontSize: '0.7rem', opacity: 0.2 }}>Image N/A</span>
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
