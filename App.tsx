/**
 * App.tsx
 * Main application entry point for falomobileapp
 */
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation';

function AppContent(): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#0F172A' : '#F8FAFC'}
      />
      <AuthProvider>
        <AlertProvider>
          <RootNavigator />
        </AlertProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;


