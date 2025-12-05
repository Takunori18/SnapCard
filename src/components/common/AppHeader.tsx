// path: src/components/layout/AppHeader.tsx など

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import CardyImage from '../common/CardyImage';
import { useTheme, Theme } from '../../theme';

const LIGHT_LOGO = require('../../../assets/images/black.png');
const DARK_LOGO = require('../../../assets/images/white.png');

type AppHeaderProps = {
  onMenuPress?: () => void;
};

export const AppHeader: React.FC<AppHeaderProps> = ({ onMenuPress }) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleDMPress = () => {
    console.log('DM icon pressed');
    // Stack.Navigator 側で name="DmList" の Screen を定義しておくこと
    navigation.navigate('DmList' as never);
  };

  return (
    <View style={styles.header}>
      {/* 左：メニュー */}
      <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
        <Ionicons name="menu" size={28} color={theme.colors.primary} />
      </TouchableOpacity>

      {/* 中央：ロゴ */}
      <View style={styles.logoContainer}>
        <CardyImage
          source={theme.isDark ? DARK_LOGO : LIGHT_LOGO}
          style={styles.logo}
          contentFit="contain"
          alt="Cardyロゴ"
          priority
        />
      </View>

      {/* 右：DM */}
      <View style={styles.rightIcons}>
        <TouchableOpacity onPress={handleDMPress} style={styles.iconButton}>
          <Ionicons name="paper-plane-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      overflow: 'visible',
    },
    logoContainer: {
      flex: 1,
      alignItems: 'center',
      overflow: 'visible',
    },
    logo: {
      width: 600,
      height: 150,
      resizeMode: 'contain',
    },
    rightIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default AppHeader;
