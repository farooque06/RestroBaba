import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
    SLATE: 'theme-slate',
    LINEN: 'theme-linen',
    BLUE: 'theme-blue',
    FOREST: 'theme-forest',
    PLUM: 'theme-plum',
    MIST: 'theme-mist'
};

export const themeInfo = {
    SLATE: { name: 'Gilded Slate', desc: 'Balanced dark, warm accents', preview: ['#111318', '#d4a853'], recommended: true },
    LINEN: { name: 'Soft Linen', desc: 'Warm, clean light mode', preview: ['#f5f2ee', '#8b6e4e'] },
    BLUE: { name: 'Ethereal Blue', desc: 'Deep blue, modern feel', preview: ['#0b1120', '#60a5fa'] },
    FOREST: { name: 'Forest Calm', desc: 'Deep green, natural accents', preview: ['#101a17', '#61b68a'] },
    PLUM: { name: 'Velvet Plum', desc: 'Rich dark plum, soft violet', preview: ['#191421', '#b68ae8'] },
    MIST: { name: 'Arctic Mist', desc: 'Cool, bright light mode', preview: ['#eff5f7', '#248a91'] },
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
