import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * A lightweight error boundary for individual list items or widgets.
 * Prevents a single item crash from breaking the entire page.
 */
class CardErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Card-level crash detected:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '1.5rem',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    textAlign: 'center',
                    minHeight: '200px'
                }}>
                    <div style={{ color: '#ef4444' }}>
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>Widget Error</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This component failed to render correctly.</div>
                    </div>
                    <button 
                        onClick={() => this.setState({ hasError: false })}
                        style={{
                            padding: '6px 12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--text-main)',
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <RotateCcw size={12} /> Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default CardErrorBoundary;
