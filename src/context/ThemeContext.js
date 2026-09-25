/**
 * src/context/ThemeContext.js
 *
 * Provides phone default theme detection (Light vs Dark mode)
 * using React Native's useColorScheme().
 */
import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { LIGHT_COLORS, DARK_COLORS } from '../constants';

const ThemeContext = createContext({
  isDark: false,
  colors: LIGHT_COLORS,
  theme: 'light',
});

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ isDark, colors, theme: systemScheme || 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
