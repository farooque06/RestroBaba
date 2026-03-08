import React, { useRef, useEffect } from 'react';

const AuthInput = ({ value, onChange, length = 6, isAlphanumeric = true }) => {
    const inputs = useRef([]);

    // Initialize array of references
    useEffect(() => {
        inputs.current = inputs.current.slice(0, length);
    }, [length]);

    const handleChange = (e, index) => {
        const val = e.target.value.toUpperCase();

        // Validation: Alphanumeric or Numeric only
        if (isAlphanumeric) {
            if (val && !/^[A-Z0-9]$/.test(val)) return;
        } else {
            if (val && !/^\d$/.test(val)) return;
        }

        const newValue = value.split('');
        // Ensure the array has enough length
        while (newValue.length < length) newValue.push('');

        newValue[index] = val;
        const finalValue = newValue.join('');
        onChange(finalValue);

        // Auto focus next
        if (val && index < length - 1) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').toUpperCase().slice(0, length);

        const isValid = isAlphanumeric
            ? /^[A-Z0-9]+$/.test(pasteData)
            : /^\d+$/.test(pasteData);

        if (isValid) {
            onChange(pasteData);
            // Focus last input or the one corresponding to length
            const lastIndex = Math.min(pasteData.length, length - 1);
            if (inputs.current[lastIndex]) {
                inputs.current[lastIndex].focus();
            }
        }
    };

    return (
        <div className="auth-input-container" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '1.5rem 0' }}>
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    type="text"
                    inputMode={isAlphanumeric ? "text" : "numeric"}
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={value[i] || ''}
                    onChange={e => handleChange(e, i)}
                    onKeyDown={e => handleKeyDown(e, i)}
                    onPaste={handlePaste}
                    className="auth-digit-box"
                    style={{
                        width: '42px',
                        height: '54px',
                        textAlign: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        padding: 0,
                        margin: 0,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'var(--primary)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        textTransform: 'uppercase',
                        outline: 'none',
                        boxShadow: value[i] ? '0 0 15px rgba(var(--primary-rgb), 0.2)' : 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
            ))}
        </div>
    );
};

export default AuthInput;
