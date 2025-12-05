import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Album, SnapCard } from '../types/card';
import { useAuth } from './AuthContext';

interface AlbumContextType {
  albums: Album[];
  loading: boolean;
  addAlbum: (name: string, coverImageUri?: string) => Promise<Album>;
  renameAlbum: (albumId: string, name: string) => Promise<void>;
  deleteAlbum: (albumId: string) => Promise<void>;
  addCardToAlbum: (albumId: string, card: SnapCard) => Promise<void>;
  removeCardFromAlbum: (albumId: string, cardId: string) => Promise<void>;
  moveCardWithinAlbum: (albumId: string, fromIndex: number, toIndex: number) => Promise<void>;
}

const AlbumContext = createContext<AlbumContextType | undefined>(undefined);

const STORAGE_KEY = '@snapcard:albums';

const buildStorageKey = (userId: string) => `${STORAGE_KEY}:${userId}`;

export const AlbumProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = profile?.id ?? user?.id ?? 'local';

  const persistAlbums = async (nextAlbums: Album[]) => {
    try {
      await AsyncStorage.setItem(buildStorageKey(currentUserId), JSON.stringify(nextAlbums));
    } catch (error) {
      console.error('アルバム保存エラー:', error);
    }
  };

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem(buildStorageKey(currentUserId));
      if (stored) {
        const parsed: Album[] = JSON.parse(stored).map((album: any) => ({
          ...album,
          createdAt: new Date(album.createdAt),
        }));
        setAlbums(parsed);
      } else {
        setAlbums([]);
      }
    } catch (error) {
      console.error('アルバム読込エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, [currentUserId]);

  const updateAlbums = (updater: (prev: Album[]) => Album[]) => {
    setAlbums(prev => {
      const updated = updater(prev);
      void persistAlbums(updated);
      return updated;
    });
  };

  const addAlbum = async (name: string, coverImageUri?: string): Promise<Album> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('アルバム名を入力してください');
    }

    const newAlbum: Album = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: currentUserId,
      name: trimmedName,
      coverImageUri,
      cardIds: [],
      createdAt: new Date(),
    };

    updateAlbums(prev => [newAlbum, ...prev]);
    return newAlbum;
  };

  const renameAlbum = async (albumId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('アルバム名を入力してください');
    }
    updateAlbums(prev =>
      prev.map(album =>
        album.id === albumId ? { ...album, name: trimmed } : album
      )
    );
  };

  const deleteAlbum = async (albumId: string) => {
    updateAlbums(prev => prev.filter(album => album.id !== albumId));
  };

  const addCardToAlbum = async (albumId: string, card: SnapCard) => {
    updateAlbums(prev =>
      prev.map(album => {
        if (album.id !== albumId) {
          return album;
        }
        if (album.cardIds.includes(card.id)) {
          return album;
        }
        const updatedCardIds = [card.id, ...album.cardIds];
        return {
          ...album,
          cardIds: updatedCardIds,
          coverImageUri: album.coverImageUri ?? card.imageUri ?? card.videoUri,
        };
      })
    );
  };

  const removeCardFromAlbum = async (albumId: string, cardId: string) => {
    updateAlbums(prev =>
      prev.map(album => {
        if (album.id !== albumId) {
          return album;
        }
        const filteredCards = album.cardIds.filter(id => id !== cardId);
        return {
          ...album,
          cardIds: filteredCards,
          coverImageUri:
            filteredCards.length === 0
              ? undefined
              : album.coverImageUri,
        };
      })
    );
  };

  const moveCardWithinAlbum = async (albumId: string, fromIndex: number, toIndex: number) => {
    updateAlbums(prev =>
      prev.map(album => {
        if (album.id !== albumId) return album;
        if (fromIndex < 0 || fromIndex >= album.cardIds.length) return album;
        const clampedTo = Math.max(0, Math.min(album.cardIds.length, toIndex));
        const next = [...album.cardIds];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(clampedTo, 0, moved);
        return { ...album, cardIds: next };
      })
    );
  };

  return (
    <AlbumContext.Provider
      value={{
        albums,
        loading,
        addAlbum,
        renameAlbum,
        deleteAlbum,
        addCardToAlbum,
        removeCardFromAlbum,
        moveCardWithinAlbum,
      }}
    >
      {children}
    </AlbumContext.Provider>
  );
};

export const useAlbumContext = () => {
  const context = useContext(AlbumContext);
  if (!context) {
    throw new Error('useAlbumContext must be used within AlbumProvider');
  }
  return context;
};
