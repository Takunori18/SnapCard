// src/screens/StoryEditor/components/StoryToolbar.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../../../theme';

type Tool = {
  id: 'text' | 'drawing' | 'sticker' | 'background';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TOOLS: Tool[] = [
  { id: 'text', icon: 'text', label: 'テキスト' },
  { id: 'drawing', icon: 'brush', label: '描画' },
  { id: 'sticker', icon: 'happy', label: 'スタンプ' },
  { id: 'background', icon: 'color-palette', label: '背景' },
];

type StoryToolbarProps = {
  activeTool: string | null;
  onToolSelect: (tool: Tool['id']) => void;
};

export const StoryToolbar: React.FC<StoryToolbarProps> = ({
  activeTool,
  onToolSelect,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <TouchableOpacity
            key={tool.id}
            style={[styles.tool, isActive && styles.toolActive]}
            onPress={() => onToolSelect(tool.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tool.icon}
              size={24}
              color={isActive ? theme.colors.accent : theme.colors.secondary}
            />
            <Text style={[styles.toolLabel, isActive && styles.toolLabelActive]}>
              {tool.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    tool: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.1)',
      minWidth: 80,
      gap: theme.spacing.xs,
    },
    toolActive: {
      backgroundColor: theme.colors.accent + '22',
    },
    toolLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.secondary,
      fontWeight: theme.fontWeight.medium,
    },
    toolLabelActive: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.bold,
    },
  });