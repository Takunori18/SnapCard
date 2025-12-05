import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

const lightColors = {
  primary: '#0F1C2E',
  secondary: '#FFFFFF',
  accent: '#3D8CFF',
  accentBlue: '#4CD7F6',
  accentPurple: '#9D7FEA',
  accentGreen: '#4CD964',
  background: '#F5F8FF',
  cardBackground: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F1C2E',
  textSecondary: '#55637A',
  textTertiary: '#8A98B3',
  error: '#F05D5E',
  success: '#2ECC71',
};

const darkColors = {
  primary: '#F5F8FF',
  secondary: '#1A2131',
  accent: '#5CA7FF',
  accentBlue: '#6FE4FF',
  accentPurple: '#B79CFF',
  accentGreen: '#7AE79A',
  background: '#0E1422',
  cardBackground: '#1E2638',
  border: '#2F3A54',
  textPrimary: '#F5F8FF',
  textSecondary: '#B0B9D2',
  textTertiary: '#7A85A1',
  error: '#F3838B',
  success: '#65E39F',
};

const baseTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export type Theme = typeof baseTheme & { colors: typeof lightColors; isDark: boolean };

const defaultTheme: Theme = {
  ...baseTheme,
  colors: lightColors,
  isDark: false,
};

const ThemeContext = createContext<Theme>(defaultTheme);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = useColorScheme();

  const value = useMemo<Theme>(() => {
    const isDark = scheme === 'dark';
    const colors = isDark ? darkColors : lightColors;
    return {
      ...baseTheme,
      colors,
      isDark,
    };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

// 既存コードとの互換性を維持するためのレガシーエクスポート
export const theme = defaultTheme;
