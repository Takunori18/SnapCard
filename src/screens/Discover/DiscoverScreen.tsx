import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/common/AppHeader';
import { FriendsTab } from './FriendsTab';
import { FeedTab } from './FeedTab';
import { ReelsTab } from './ReelsTab';
import { useTheme, Theme } from '../../theme';

type TabType = 'friends' | 'feed' | 'reels';

export const DiscoverScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderContent = () => {
    switch (activeTab) {
      case 'friends':
        return <FriendsTab />;
      case 'feed':
        return <FeedTab />;
      case 'reels':
        return <ReelsTab />;
      default:
        return <FriendsTab />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader 
        onMenuPress={() => console.log('Menu pressed')}
        onDMPress={() => console.log('DM pressed')}
      />
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            友達
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
          onPress={() => setActiveTab('feed')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>
            フィード
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reels' && styles.tabActive]}
          onPress={() => setActiveTab('reels')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'reels' && styles.tabTextActive]}>
            リール
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
