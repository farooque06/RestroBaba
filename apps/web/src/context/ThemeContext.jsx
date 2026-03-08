import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
    SLATE: 'theme-slate',
    LINEN: 'theme-linen',
    BLUE: 'theme-blue'
};

export const themeInfo = {
    SLATE: { name: 'Gilded Slate', desc: 'Dark & warm', preview: ['#111318', '#d4a853'] },
    LINEN: { name: 'Soft Linen', desc: 'Light & clean', preview: ['#f5f2ee', '#8b6e4e'] },
    BLUE: { name: 'Ethereal Blue', desc: 'Deep & modern', preview: ['#0b1120', '#60a5fa'] },
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('restroTheme') || themes.SLATE);

    useEffect(() => {
        Object.values(themes).forEach(t => document.body.classList.remove(t));
        document.body.classList.add(theme);
        localStorage.setItem('restroTheme', theme);
    }, [theme]);

    const switchTheme = (themeKey) => {
        if (themes[themeKey]) {
            setTheme(themes[themeKey]);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, switchTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
