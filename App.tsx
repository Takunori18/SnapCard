// path: App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Platform } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SnapCardProvider } from './src/contexts/SnapCardContext';
import { AlbumProvider } from './src/contexts/AlbumContext';
import { StoryProvider } from './src/contexts/StoryContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { FollowProvider } from './src/contexts/FollowContext';
import { DmProvider } from './src/contexts/DmContext';
import { ThemeProvider } from './src/theme';
import * as Font from 'expo-font';

const AppContent = () => {
  const colorScheme = useColorScheme();
  const isWeb = Platform.OS === 'web';
  const [fontsLoaded, fontError] = Font.useFonts({
    'GreatVibes-Regular': require('./assets/fonts/GreatVibes-Regular.ttf'),
    'SpaceGrotesk-Regular': require('./assets/fonts/SpaceGrotesk-Regular.ttf'),
    'Pacifico-Regular': require('./assets/fonts/Pacifico-Regular.ttf'),
  });

  if (fontError) {
    console.warn('Font loading error:', fontError);
  }

  if (!fontsLoaded && !isWeb) {
    return null;
  }

  return (
    <AuthProvider>
      <FollowProvider>
        <DmProvider>
          <SnapCardProvider>
            <AlbumProvider>
              <StoryProvider>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                <AppNavigator />
              </StoryProvider>
            </AlbumProvider>
          </SnapCardProvider>
        </DmProvider>
      </FollowProvider>
    </AuthProvider>
  );
};


export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}