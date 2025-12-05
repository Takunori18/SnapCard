import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { CardsTab } from './CardsTab';
import { AlbumsTab } from './AlbumsTab'; // ★ BinderTab から AlbumsTab に変更
import { EditTab } from './EditTab';
import { MusicTab } from './MusicTab';
import { useTheme, Theme } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

// ★ TabType の binder を albums に変更
type TabType = 'cards' | 'albums' | 'edit' | 'music';

export const MyCardsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('cards');
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderContent = () => {
    switch (activeTab) {
      case 'cards':
        return <CardsTab />;
      case 'albums': // ★ binder から albums に変更
        return <AlbumsTab />; // ★ BinderTab から AlbumsTab に変更
      case 'edit':
        return <EditTab />;
      case 'music':
        return <MusicTab />;
      default:
        return <CardsTab />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader 
        onMenuPress={() => console.log('Menu pressed')}
        onDMPress={() => console.log('DM pressed')}
      />

      <View style={styles.tabBar}>
        {/* ★ カード */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cards' && styles.tabActive]}
          onPress={() => setActiveTab('cards')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'cards' && styles.tabTextActive]}>
            カード
          </Text>
        </TouchableOpacity>

        {/* ★ アルバム（旧：バインダー） */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'albums' && styles.tabActive]}
          onPress={() => setActiveTab('albums')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'albums' && styles.tabTextActive]}>
            アルバム
          </Text>
        </TouchableOpacity>

        {/* ★ 編集 */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'edit' && styles.tabActive]}
          onPress={() => setActiveTab('edit')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'edit' && styles.tabTextActive]}>
            編集
          </Text>
        </TouchableOpacity>

        {/* ★ 音楽 */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'music' && styles.tabActive]}
          onPress={() => setActiveTab('music')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'music' && styles.tabTextActive]}>
            音楽
          </Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: theme.colors.accent,
    },
    tabText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.bold,
    },
  });
