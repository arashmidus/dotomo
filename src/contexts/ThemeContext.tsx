import { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  accent: string;
}

const darkTheme: ThemeColors = {
  background: '#111827',
  surface: 'rgba(30, 32, 35, 0.8)',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  primary: '#3b82f6',
  accent: '#60a5fa',
};

const ThemeContext = createContext<ThemeColors>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(darkTheme);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
} 