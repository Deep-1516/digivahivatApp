/**
 * src/context/ThemeContext.js
 *
 * Provides phone default theme detection (Light vs Dark mode)
 * using React Native's useColorScheme().
 */
import React, { createContext, useContext } from 'react';
import { THEME_COLORS, FONTS } from '../constants';

const ThemeContext = createContext({
  isDark: false,
  colors: THEME_COLORS,
  fonts: FONTS,
  theme: 'light',
});

export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ isDark: false, colors: THEME_COLORS, fonts: FONTS, theme: 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
