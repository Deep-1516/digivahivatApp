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
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#121212"
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


