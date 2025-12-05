import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import CardyImage from '../../components/common/CardyImage';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, Theme } from '../../theme';
import { useSnapCardContext } from '../../contexts/SnapCardContext';
import { useAuth } from '../../contexts/AuthContext';
import { SnapCard } from '../../types/card';

type MapCard = SnapCard & {
  latitude: number;
  longitude: number;
};

const FALLBACK_REGION: Region = {
  latitude: 35.6804,
  longitude: 139.769,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// TODO: カードに実際の緯度経度を保存したらこのテーブルは削除する。
const MOCK_COORDINATES = [
  { latitude: 35.658, longitude: 139.701 },
  { latitude: 35.710, longitude: 139.8107 },
  { latitude: 35.6895, longitude: 139.6917 },
  { latitude: 35.695, longitude: 139.770 },
  { latitude: 35.704, longitude: 139.579 },
];

export const MapScreen: React.FC = () => {
  const { cards } = useSnapCardContext();
  const { user, profile } = useAuth();
  const activeProfileId = profile?.id ?? user?.id ?? null;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const screenHeight = Dimensions.get('window').height;

  const [region, setRegion] = useState<Region>(FALLBACK_REGION);
  const [selectedCard, setSelectedCard] = useState<MapCard | null>(null);
  const [locating, setLocating] = useState(false);

  const mountedRef = useRef(true);

  const requestLocation = useCallback(() => {
    const geolocation = (globalThis as any)?.navigator?.geolocation;
    if (!geolocation) {
      console.warn('Geolocation API is not available on this platform.');
      return;
    }

    setLocating(true);
    geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        setRegion((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocating(false);
      },
      (error) => {
        console.warn('Failed to acquire location', error);
        if (mountedRef.current) setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
    return () => {
      mountedRef.current = false;
    };
  }, [requestLocation]);

  const cardsWithLocation = useMemo(() => {
    if (!activeProfileId) {
      return [] as MapCard[];
    }
    const ownCards = cards.filter(card => card.userId === activeProfileId);
    return ownCards
      .map((card, index) => {
        const coords = MOCK_COORDINATES[index % MOCK_COORDINATES.length];
        if (!coords) return null;
        return { ...card, ...coords };
      })
      .filter(Boolean) as MapCard[];
  }, [cards, activeProfileId]);

  const handleMarkerPress = useCallback((card: MapCard) => {
    setSelectedCard(card);
  }, []);

  const closePreview = () => setSelectedCard(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
      >
        {cardsWithLocation.map((card) => (
          <Marker
            key={card.id}
            coordinate={{ latitude: card.latitude, longitude: card.longitude }}
            onPress={() => handleMarkerPress(card)}
          >
            <View style={styles.markerContainer}>
              {card.imageUri ? (
                <CardyImage
                  source={{ uri: card.imageUri, cacheKey: `map-pin-${card.id}` }}
                  style={styles.markerImage}
                  contentFit="cover"
                  alt={`マーカー ${card.caption || card.id}`}
                />
              ) : (
                <View style={[styles.markerImage, styles.markerPlaceholder]}>
                  <Ionicons name="image-outline" size={18} color={theme.colors.textSecondary} />
                </View>
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      <TouchableOpacity
        style={styles.locateButton}
        onPress={requestLocation}
        activeOpacity={0.8}
      >
        {locating ? (
          <Text style={styles.locateButtonText}>...</Text>
        ) : (
          <Ionicons name="navigate-circle" size={30} color={theme.colors.accentBlue} />
        )}
      </TouchableOpacity>

      {selectedCard && (
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closePreview}>
          <View style={[styles.previewSheet, { maxHeight: screenHeight * 0.4 }]}>
            <View style={styles.previewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewCaption} numberOfLines={1}>
                  {selectedCard.caption || 'キャプションなし'}
                </Text>
                <Text style={styles.previewMeta} numberOfLines={1}>
                  @{selectedCard.userId} ・ {selectedCard.createdAt.toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity onPress={closePreview}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedCard.imageUri ? (
              <CardyImage
                source={{ uri: selectedCard.imageUri }}
                style={styles.previewImage}
                contentFit="cover"
                alt={selectedCard.caption || 'カードプレビュー'}
                priority
              />
            ) : (
              <View style={[styles.previewImage, styles.markerPlaceholder]}>
                <Ionicons name="image-outline" size={28} color={theme.colors.textSecondary} />
              </View>
            )}
            <TouchableOpacity style={styles.previewButton} onPress={closePreview}>
              <Text style={styles.previewButtonText}>カードを見る</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    map: {
      flex: 1,
    },
    markerContainer: {
      width: 54,
      height: 72,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: '#fff',
      overflow: 'hidden',
      elevation: 6,
    },
    markerImage: {
      width: '100%',
      height: '100%',
    },
    markerPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
    },
    locateButton: {
      position: 'absolute',
      right: 16,
      bottom: 96,
      backgroundColor: theme.colors.secondary,
      padding: 10,
      borderRadius: theme.borderRadius.full,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locateButtonText: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.bold,
    },
    backdrop: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.25)',
      justifyContent: 'flex-end',
    },
    previewSheet: {
      backgroundColor: theme.colors.secondary,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    previewCaption: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    previewMeta: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    previewImage: {
      width: '100%',
      height: 180,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    previewButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    previewButtonText: {
      color: '#fff',
      fontWeight: theme.fontWeight.bold,
    },
  });
