// src/screens/MyCards/MusicTab.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { Audio } from 'expo-av';

import { useTheme, Theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { loginWithSpotify } from '../../lib/spotify/auth';
import {
  searchSpotifyTracks,
  SpotifyTrack,
} from '../../lib/spotify/api';
import {
  upsertSpotifyTrackForUser,
  attachBgmToCard,
} from '../../lib/music/tracks';

type Mode = 'browse' | 'attach';

export const MusicTab: React.FC = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { user } = useAuth();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [mode, setMode] = useState<Mode>('browse');
  const [message, setMessage] = useState<string | null>(null);

  // プレビュー再生用
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // TODO: MyCards 側で選択中カードIDを渡すようにしたら差し替える
  const currentCardId: string | null = null;

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const ensureAccessToken = async () => {
    if (accessToken) return accessToken;
    setLoadingAuth(true);
    setMessage(null);
    try {
      const { accessToken: token } = await loginWithSpotify();
      setAccessToken(token);
      return token;
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message ?? 'Spotify ログインに失敗しました');
      throw e;
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSearch = async () => {
    try {
      const token = await ensureAccessToken();
      setLoadingSearch(true);
      setMessage(null);
      const tracks = await searchSpotifyTracks(token, query);
      setResults(tracks);
      if (tracks.length === 0) {
        setMessage('曲が見つかりませんでした');
      }
    } catch {
      // ensureAccessToken でメッセージ済み
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleOpenInSpotify = (track: SpotifyTrack) => {
    if (track.externalUrl) {
      Linking.openURL(track.externalUrl);
    }
  };

  const stopPreview = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (e) {
        console.error('stop preview error', e);
      }
    }
    setSound(null);
    setPlayingId(null);
  };

  const playPreview = async (track: SpotifyTrack) => {
    // 同じ曲をタップしたら停止
    if (playingId === track.id) {
      await stopPreview();
      return;
    }

    // プレビュー URL がない曲 → 何も再生せずメッセージだけ
    if (!track.previewUrl) {
      setMessage(
        'この曲はアプリ内プレビューに対応していません（長押しで Spotify を開きます）'
      );
      return;
    }

    try {
      await stopPreview();

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.previewUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingId(track.id);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (e) {
      console.error('preview play error', e);
      setMessage('プレビュー再生に失敗しました');
    }
  };

  const handleAttachToCard = async (track: SpotifyTrack) => {
    if (!user) {
      setMessage('ログインが必要です');
      return;
    }
    if (!currentCardId) {
      setMessage('カード選択の実装はまだです（TODO）');
      return;
    }
    try {
      setMessage(null);
      const musicRow = await upsertSpotifyTrackForUser(user.id, track);
      await attachBgmToCard(currentCardId, musicRow.id);
      setMessage('このカードにBGMを設定しました');
    } catch (e) {
      console.error(e);
      setMessage('BGM の設定に失敗しました');
    }
  };

  const renderItem = ({ item }: { item: SpotifyTrack }) => {
    const isPlaying = playingId === item.id;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.8}
        onPress={() => playPreview(item)}
        onLongPress={() => handleOpenInSpotify(item)}
      >
        <View style={styles.iconWrapper}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color={theme.colors.accent}
          />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.artists}
          </Text>
        </View>
        {mode === 'attach' && (
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => handleAttachToCard(item)}
          >
            <Text style={styles.attachButtonText}>カードに設定</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 上部ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>音楽</Text>
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'browse' && styles.modeButtonActive,
              ]}
              onPress={() => setMode('browse')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'browse' && styles.modeButtonTextActive,
                ]}
              >
                再生
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'attach' && styles.modeButtonActive,
              ]}
              onPress={() => setMode('attach')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'attach' && styles.modeButtonTextActive,
                ]}
              >
                BGM設定
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Spotify で曲を検索して、Cardy 内でプレビュー再生したりカードのBGMとして使えます。
        </Text>

        {/* 検索バー */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Ionicons
              name="search"
              size={18}
              color={theme.colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Spotify で曲名・アーティストを検索"
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loadingSearch || loadingAuth}
          >
            {loadingSearch || loadingAuth ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>検索</Text>
            )}
          </TouchableOpacity>
        </View>

        {message && <Text style={styles.message}>{message}</Text>}
      </View>

      {/* 検索結果リスト */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loadingSearch &&
          !loadingAuth && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                曲を検索すると、ここに Spotify の結果が表示されます。
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    searchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.secondary,
      gap: 6,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      paddingVertical: 2,
    },
    searchButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchButtonText: {
      color: '#fff',
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
    },
    message: {
      marginTop: theme.spacing.xs,
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    iconWrapper: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrapper: {
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    title: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    attachButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    attachButtonText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.bold,
    },
    empty: {
      padding: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    modeSwitcher: {
      flexDirection: 'row',
      borderRadius: 999,
      backgroundColor: theme.colors.secondary,
      overflow: 'hidden',
    },
    modeButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    modeButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    modeButtonText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    modeButtonTextActive: {
      color: '#fff',
      fontWeight: theme.fontWeight.bold,
    },
  });
