import React, { useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, ActivityIndicator, Text, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';

// Screens
import { MyCardsScreen } from '../screens/MyCards/MyCardsScreen';
import { DiscoverScreen } from '../screens/Discover/DiscoverScreen';
import { CameraScreen } from '../screens/Camera/CameraScreen';
import { CardEditScreen } from '../screens/Camera/CardEditScreen';
import { StoryEditScreen } from '../screens/Camera/StoryEditScreen';
import { CardEditorScreen } from '../screens/CardEditor/CardEditorScreen';
import { StoryEditorScreen } from '../screens/StoryEditor/StoryEditorScreen';
import { MapScreen } from '../screens/Map/MapScreen';
import { AccountScreen } from '../screens/Account/AccountScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { ProfileEditScreen } from '../screens/Account/ProfileEditScreen';
import { UserProfileScreen } from '../screens/Account/UserProfileScreen';
import DmListScreen from '../screens/dm/DmListScreen';
import DmThreadScreen from '../screens/dm/DmThreadScreen';

import { AccountSwitcherModal } from '../components/modals/AccountSwitcherModal';

// ★ ダークモード用とライトモード用のアイコンを両方インポート
const CAMERA_ICON_BLACK = require('../../assets/images/camera-icon-black.png');
const CAMERA_ICON_WHITE = require('../../assets/images/camera-icon-white.png');

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// =======================
// カスタムカメラボタン
// =======================
const CustomCameraButton = ({ children, onPress }: any) => {
  const theme = useTheme();
  const styles = useMemo(() => createCameraButtonStyles(theme), [theme]);

  const cameraIcon = theme.isDark ? CAMERA_ICON_WHITE : CAMERA_ICON_BLACK;

  return (
    <TouchableOpacity style={styles.cameraButton} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cameraButtonInner}>
        <View style={styles.cameraGleam}>
          <Image source={cameraIcon} style={styles.cameraIcon} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// =======================
// ボトムタブ（下のバー）
// =======================
function BottomTabs() {
  const theme = useTheme();
  const [switcherVisible, setSwitcherVisible] = useState(false);

  const tabBarStyle = useMemo(
    () => ({
      height: Platform.OS === 'ios' ? 90 : 70,
      paddingBottom: Platform.OS === 'ios' ? 30 : 10,
      paddingTop: 10,
      backgroundColor: theme.colors.secondary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
    [theme]
  );

  return (
    <>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="MyCards"
          component={MyCardsScreen}
          options={{
            tabBarLabel: 'マイカード',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card-outline" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Home"
          component={DiscoverScreen}
          options={{
            tabBarLabel: 'ホーム',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Camera"
          component={CameraScreen}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => null,
            tabBarButton: (props) => <CustomCameraButton {...props} />,
          }}
        />

        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            tabBarLabel: 'マップ',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map-outline" size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Account"
          component={AccountScreen}
          options={{
            tabBarLabel: 'アカウント',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={props.onPress}
                onLongPress={(event) => {
                  props.onLongPress?.(event);
                  setSwitcherVisible(true);
                }}
              >
                {props.children}
              </TouchableOpacity>
            ),
          }}
        />
      </Tab.Navigator>

      <AccountSwitcherModal
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
      />
    </>
  );
}

// =======================
// ルートナビゲーター
// =======================
export function AppNavigator() {
  const { user, loading } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createAppNavigatorStyles(theme), [theme]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabs} />
            <Stack.Screen name="CardEdit" component={CardEditScreen} />
            <Stack.Screen name="StoryEdit" component={StoryEditScreen} />
            <Stack.Screen name="CardEditor" component={CardEditorScreen} />
            <Stack.Screen name="StoryEditor" component={StoryEditorScreen} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="DmList" component={DmListScreen} />
            <Stack.Screen name="DmThread" component={DmThreadScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// =======================
// スタイル
// =======================

const baseStyles = StyleSheet.create({
  cameraButton: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

const createCameraButtonStyles = (theme: Theme) =>
  StyleSheet.create({
    cameraButton: baseStyles.cameraButton,
    cameraButtonInner: {
      ...baseStyles.cameraButtonInner,
      backgroundColor: theme.colors.accent,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cameraGleam: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraIcon: {
      width: 56,
      height: 56,
      resizeMode: 'contain',
    },
  });

const createAppNavigatorStyles = (theme: Theme) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
  });
