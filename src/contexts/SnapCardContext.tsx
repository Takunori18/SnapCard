import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { SnapCard, CardMediaType } from '../types/card';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from './AuthContext';
import { readUriAsArrayBuffer } from '../utils/file';

interface SnapCardContextType {
  cards: SnapCard[];
  addCard: (card: Omit<SnapCard, 'id' | 'createdAt' | 'likesCount'>) => Promise<SnapCard>;
  deleteCard: (id: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<SnapCard>) => Promise<void>;
  reloadCards: () => Promise<void>;
  loading: boolean;
  uploadImage: (uri: string) => Promise<string | null>;
  uploadThumbnail: (uri: string) => Promise<string | null>;
}

const SnapCardContext = createContext<SnapCardContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = '@snapcard:cards';
const getStorageKey = (identityId?: string | null) =>
  identityId ? `${STORAGE_KEY_PREFIX}:${identityId}` : STORAGE_KEY_PREFIX;
const TITLE_TAG_PREFIX = '__cardy_title__::';
const PROFILE_TAG_PREFIX = '__cardy_profile__::';

const sanitizeLegacyTags = (tags?: string[]) => {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags.filter(
    tag =>
      typeof tag === 'string' &&
      !tag.startsWith(TITLE_TAG_PREFIX) &&
      !tag.startsWith(PROFILE_TAG_PREFIX),
  );
};

const extractLegacyMetadata = (
  tags?: string[],
  fallbackTitle?: string,
  fallbackProfileId?: string,
) => {
  if (!Array.isArray(tags)) {
    return { title: fallbackTitle, profileId: fallbackProfileId };
  }
  let derivedTitle: string | undefined = fallbackTitle;
  let derivedProfileId: string | undefined = fallbackProfileId;
  tags.forEach(tag => {
    if (typeof tag !== 'string') {
      return;
    }
    if (!derivedTitle && tag.startsWith(TITLE_TAG_PREFIX)) {
      derivedTitle = tag.slice(TITLE_TAG_PREFIX.length);
      return;
    }
    if (!derivedProfileId && tag.startsWith(PROFILE_TAG_PREFIX)) {
      derivedProfileId = tag.slice(PROFILE_TAG_PREFIX.length);
      return;
    }
  });
  return { title: derivedTitle, profileId: derivedProfileId };
};

const isMissingColumnError = (error: any, column: string) => {
  const lowerColumn = column.toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();
  const details = String(error?.details ?? '').toLowerCase();
  return (
    message.includes(`column "${lowerColumn}`) ||
    details.includes(`column "${lowerColumn}`) ||
    message.includes(`'${lowerColumn}' column`)
  );
};

export const SnapCardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cards, setCards] = useState<SnapCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const activeIdentity = profile?.id ?? user?.id ?? null;
  const getIdentityId = () => profile?.id ?? user?.id ?? activeIdentity;

  const loadCards = async (ownerRef: string, identityId: string | null) => {
    setLoading(true);
    try {
      const builder = supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });
      const query = builder.eq('user_id', identityId ?? ownerRef);

      const { data: supabaseCards, error } = await query;

      if (error) {
        console.error('Supabase読み込みエラー:', error?.message ?? error);
        await loadFromLocalStorage(identityId);
      } else if (supabaseCards) {
        const cardsWithDates = supabaseCards.map((card: any) => {
          const cleanTags = sanitizeLegacyTags(card.tags);
          const legacy = extractLegacyMetadata(card.tags, card.title ?? undefined, card.user_id ?? undefined);
          const derivedMediaType: CardMediaType =
            (card.media_type as CardMediaType) ?? (card.video_url ? 'video' : 'image');
          return {
            id: card.id,
            imageUri: card.image_url ?? undefined,
            videoUri: card.video_url ?? undefined,
            thumbnailUrl: card.thumbnail_url ?? undefined,
            mediaType: derivedMediaType,
            title: card.title ?? legacy.title ?? '',
            caption: card.caption,
            location: card.location,
            tags: cleanTags,
            likesCount: card.likes_count || 0,
            createdAt: new Date(card.created_at),
            userId: card.user_id ?? legacy.profileId ?? card.user_id,
            isPublic: card.is_public ?? true,
          };
        });
        setCards(cardsWithDates);
      }
    } catch (error) {
      console.error('カード読み込みエラー:', error);
      await loadFromLocalStorage(identityId);
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = async (identityId?: string | null) => {
    try {
      const key = getStorageKey(identityId);
      let stored = await AsyncStorage.getItem(key);
      if (!stored && identityId) {
        stored = await AsyncStorage.getItem(STORAGE_KEY_PREFIX);
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        const cardsWithDates = parsed.map((card: any) => {
          const cleanTags = sanitizeLegacyTags(card.tags);
          const legacy = extractLegacyMetadata(card.tags, card.title, card.userId);
          const derivedMediaType: CardMediaType =
            card.mediaType === 'video'
              ? 'video'
              : card.mediaType === 'image'
              ? 'image'
              : card.videoUri
              ? 'video'
              : 'image';
          return {
            ...card,
            imageUri: card.imageUri ?? undefined,
            videoUri: card.videoUri ?? undefined,
            thumbnailUrl: card.thumbnailUrl ?? undefined,
            mediaType: derivedMediaType,
            title: card.title ?? legacy.title ?? '',
            tags: cleanTags,
            userId: legacy.profileId ?? card.userId,
            createdAt: new Date(card.createdAt),
            isPublic: card.isPublic ?? true,
          };
        });
        const filtered = identityId
          ? cardsWithDates.filter(card => card.userId === identityId)
          : cardsWithDates;
        setCards(filtered);
      }
    } catch (error) {
      console.error('ローカルストレージ読み込みエラー:', error);
    }
  };

  const saveToLocalStorage = async (identityId: string | null, newCards: SnapCard[]) => {
    if (!identityId) {
      return;
    }
    const key = getStorageKey(identityId);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(newCards));
    } catch (error) {
      console.error('ローカルストレージ保存エラー:', error);
    }
  };

  useEffect(() => {
    const ownerRef = profile?.owner_id ?? user?.id ?? activeIdentity;
    const identityId = profile?.id ?? user?.id ?? activeIdentity;
    setCards([]);
    if (!ownerRef) {
      (async () => {
        await loadFromLocalStorage(identityId);
        setLoading(false);
      })();
      return;
    }

    loadCards(ownerRef, identityId);
  }, [activeIdentity, profile?.owner_id, user?.id, profile?.id]);

  const uploadAsset = async (uri: string, extension: string, contentType: string, folder: string = 'cards'): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${extension}`;
      const filePath = `${folder}/${fileName}`;

      if (uri.startsWith('file://')) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('ファイルが存在しません');
        }
      }

      const fileBuffer = await readUriAsArrayBuffer(uri);

      const { error } = await supabase.storage
        .from('card-images')
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('アセットアップロードエラー:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('card-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('アセット処理エラー:', error);
      return null;
    }
  };

  const uploadImage = (uri: string) => uploadAsset(uri, '.jpg', 'image/jpeg', 'cards');
  const uploadVideo = (uri: string) => uploadAsset(uri, '.mp4', 'video/mp4', 'cards');
  const uploadThumbnail = (uri: string) => uploadAsset(uri, '.jpg', 'image/jpeg', 'thumbnails');

  const reloadCards = async () => {
    const ownerRef = profile?.owner_id ?? user?.id ?? activeIdentity;
    const identityId = profile?.id ?? user?.id ?? activeIdentity;
    if (ownerRef) {
      await loadCards(ownerRef, identityId);
    } else {
      await loadFromLocalStorage(identityId);
    }
  };

  const addCard = async (cardData: Omit<SnapCard, 'id' | 'createdAt' | 'likesCount'>) => {
    const profileIdentifier = cardData.userId ?? activeIdentity;
    const storageUserId = profile?.owner_id ?? user?.id ?? profileIdentifier;
    if (!storageUserId || !profileIdentifier) {
      throw new Error('カードの所有者情報が見つかりません');
    }
    const normalizedTitle = cardData.title?.trim() || '無題';
    const isVideoCard = cardData.mediaType === 'video';

    try {
      let imageUrl = cardData.imageUri ?? null;
      let videoUrl = cardData.videoUri ?? null;
      let thumbnailUrl = cardData.thumbnailUrl ?? null;

      if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('blob:'))) {
        const uploadedUrl = await uploadImage(imageUrl);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      if (isVideoCard) {
        if (!videoUrl) {
          throw new Error('動画のURIが見つかりません');
        }
        if (videoUrl.startsWith('file://') || videoUrl.startsWith('blob:')) {
          const uploadedVideo = await uploadVideo(videoUrl);
          if (uploadedVideo) {
            videoUrl = uploadedVideo;
          }
        }
      } else {
        videoUrl = null;
      }

      if (thumbnailUrl && (thumbnailUrl.startsWith('file://') || thumbnailUrl.startsWith('blob:'))) {
        const uploadedThumbnail = await uploadThumbnail(thumbnailUrl);
        if (uploadedThumbnail) {
          thumbnailUrl = uploadedThumbnail;
        }
      }

      const cleanTags = sanitizeLegacyTags(cardData.tags);

      const cleanTags = sanitizeLegacyTags(cardData.tags);
      const buildPayload = () => {
        const timestamp = new Date().toISOString();
        return {
          image_url: imageUrl ?? videoUrl ?? null,
          video_url: videoUrl ?? null,
          thumbnail_url: thumbnailUrl ?? null,
          media_type: isVideoCard ? 'video' : 'image',
          caption: cardData.caption,
          location: cardData.location,
          tags: cleanTags,
          user_id: profileIdentifier,
          likes_count: 0,
          is_public: cardData.isPublic ?? true,
          created_at: timestamp,
          updated_at: timestamp,
          title: normalizedTitle,
        };
      };

      const executeInsert = async (payload: any) =>
        supabase.from('cards').insert([payload]).select().single();

      const { data, error } = await executeInsert(buildPayload());

      if (error) {
        if (isMissingColumnError(error, 'title')) {
          throw new Error(
            'cards テーブルに title カラムが存在しません。Supabase で ALTER TABLE cards ADD COLUMN title text; を実行してください。',
          );
        }
        if (isMissingColumnError(error, 'video_url') || isMissingColumnError(error, 'media_type')) {
          throw new Error(
            'cards テーブルに video_url / media_type カラムが存在しません。Supabase で ALTER TABLE cards ADD COLUMN video_url text, ADD COLUMN media_type text DEFAULT \'image\'; を実行してください。',
          );
        }
        throw error;
      }

      const cleanResultTags = sanitizeLegacyTags(data.tags);
      const legacy = extractLegacyMetadata(
        data.tags,
        data.title ?? normalizedTitle,
        data.user_id ?? profileIdentifier,
      );

      const derivedMediaType: CardMediaType =
        (data.media_type as CardMediaType) ?? (data.video_url ? 'video' : 'image');
      const newCard: SnapCard = {
        id: data.id,
        imageUri: data.image_url ?? undefined,
        videoUri: data.video_url ?? undefined,
        thumbnailUrl: data.thumbnail_url ?? undefined,
        mediaType: derivedMediaType,
        title: data.title ?? legacy.title ?? normalizedTitle,
        caption: data.caption,
        location: data.location,
        tags: cleanResultTags,
        likesCount: data.likes_count || 0,
        createdAt: new Date(data.created_at),
        userId: data.user_id ?? legacy.profileId ?? profileIdentifier,
        isPublic: data.is_public ?? true,
      };

      const updatedCards = [newCard, ...cards];
      setCards(updatedCards);
      await saveToLocalStorage(getIdentityId(), updatedCards);
      return newCard;
    } catch (error) {
      console.error('カード追加エラー:', error);

      const newCard: SnapCard = {
        ...cardData,
        imageUri: imageUrl ?? cardData.imageUri,
        videoUri: isVideoCard ? (videoUrl ?? cardData.videoUri) : undefined,
        thumbnailUrl: thumbnailUrl ?? cardData.thumbnailUrl,
        mediaType: isVideoCard ? 'video' : 'image',
        title: normalizedTitle,
        userId: profileIdentifier,
        id: Date.now().toString(),
        createdAt: new Date(),
        likesCount: 0,
        isPublic: cardData.isPublic ?? true,
      };

      const updatedCards = [newCard, ...cards];
      setCards(updatedCards);
      await saveToLocalStorage(getIdentityId(), updatedCards);
      return newCard;
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase削除エラー:', error);
      }
    } catch (error) {
      console.error('カード削除エラー:', error);
    }

    const identityId = getIdentityId();
    setCards(prevCards => {
      const updatedCards = prevCards.filter(card => card.id !== id);
      void saveToLocalStorage(identityId, updatedCards);
      return updatedCards;
    });
  };

  const updateCard = async (id: string, updates: Partial<SnapCard>) => {
    const trimmedTitle = updates.title?.trim();
    const sanitizedTags =
      updates.tags === undefined ? undefined : sanitizeLegacyTags(updates.tags);
    const payload: Record<string, any> = {};

    if (trimmedTitle !== undefined) {
      payload.title = trimmedTitle;
    } else if (updates.title !== undefined) {
      payload.title = updates.title;
    }
    if (updates.caption !== undefined) {
      payload.caption = updates.caption;
    }
    if (updates.location !== undefined) {
      payload.location = updates.location;
    }
    if (sanitizedTags !== undefined) {
      payload.tags = sanitizedTags;
    }
    if (updates.likesCount !== undefined) {
      payload.likes_count = updates.likesCount;
    }

    try {
      if (Object.keys(payload).length > 0) {
        const { error } = await supabase
          .from('cards')
          .update(payload)
          .eq('id', id);

        if (error) {
          console.error('Supabase更新エラー:', error);
        }
      }
    } catch (error) {
      console.error('カード更新エラー:', error);
    }

    const updatedCards = cards.map(card =>
      card.id === id
        ? {
            ...card,
            ...updates,
            ...(trimmedTitle !== undefined
              ? { title: trimmedTitle }
              : updates.title !== undefined
              ? { title: updates.title }
              : {}),
            ...(sanitizedTags !== undefined ? { tags: sanitizedTags } : {}),
          }
        : card,
    );
    setCards(updatedCards);
    await saveToLocalStorage(getIdentityId(), updatedCards);
  };

  return (
    <SnapCardContext.Provider 
      value={{ cards, addCard, deleteCard, updateCard, reloadCards, loading, uploadImage, uploadThumbnail }}
    >
      {children}
    </SnapCardContext.Provider>
  );
};

export const useSnapCardContext = () => {
  const context = useContext(SnapCardContext);
  if (!context) {
    throw new Error('useSnapCardContext must be used within SnapCardProvider');
  }
  return context;
};
