import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SnapCard, CardMediaType, CardLocation } from '../types/card';
import { useAuth } from './AuthContext';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

interface AddCardData {
  imageUri?: string;
  videoUri?: string;
  thumbnailUrl?: string;
  mediaType: CardMediaType;
  title?: string;
  caption?: string;
  location?: string;
  locationData?: CardLocation; // ★ 位置情報を追加
  tags: string[];
  userId: string;
  isPublic?: boolean;
}

interface SnapCardContextType {
  cards: SnapCard[];
  loading: boolean;
  addCard: (cardData: AddCardData) => Promise<SnapCard>;
  updateCard: (cardId: string, updates: Partial<SnapCard>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  refreshCards: () => Promise<void>;
  getCardById: (cardId: string) => SnapCard | undefined;
}

const SnapCardContext = createContext<SnapCardContextType | undefined>(undefined);

export const SnapCardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cards, setCards] = useState<SnapCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  // カード一覧取得
  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedCards: SnapCard[] = data.map((card) => ({
          id: card.id,
          imageUri: card.image_url,
          videoUri: card.video_url,
          thumbnailUrl: card.thumbnail_url,
          mediaType: card.media_type as CardMediaType,
          title: card.title,
          caption: card.caption,
          location: card.location,
          // ★ 位置情報をマッピング
          locationData: card.latitude && card.longitude
            ? {
                latitude: card.latitude,
                longitude: card.longitude,
                placeId: card.place_id,
                placeName: card.place_name,
                placeAddress: card.place_address,
              }
            : undefined,
          tags: card.tags || [],
          likesCount: card.likes_count || 0,
          createdAt: new Date(card.created_at),
          userId: card.user_id,
          isPublic: card.is_public ?? true,
        }));

        setCards(mappedCards);
      }
    } catch (error) {
      console.error('カード取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  // カード追加
  const addCard = async (cardData: AddCardData): Promise<SnapCard> => {
    try {
      const {
        imageUri,
        videoUri,
        thumbnailUrl,
        mediaType,
        title,
        caption,
        location,
        locationData, // ★ 位置情報を受け取る
        tags,
        userId,
        isPublic = true,
      } = cardData;

      const isVideoCard = mediaType === 'video';
      const profileIdentifier = profile?.id ?? userId;

      // メディアファイルをSupabase Storageにアップロード
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      // 画像のアップロード
      if (imageUri && !isVideoCard) {
        imageUrl = await uploadFile(imageUri, 'image', profileIdentifier);
      }

      // 動画のアップロード
      if (videoUri && isVideoCard) {
        videoUrl = await uploadFile(videoUri, 'video', profileIdentifier);
      }

      // サムネイルのアップロード（動画の場合）
      if (thumbnailUrl && isVideoCard) {
        imageUrl = await uploadFile(thumbnailUrl, 'thumbnail', profileIdentifier);
      }

      // タグのクリーンアップ
      const sourceTags = Array.isArray(tags) ? tags : [];
      const cleanTags = sourceTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

      // Supabaseにカードメタデータを保存
      const timestamp = new Date().toISOString();
      
      const payload = {
        image_url: imageUrl ?? videoUrl ?? null,
        video_url: videoUrl ?? null,
        thumbnail_url: thumbnailUrl ?? null,
        media_type: isVideoCard ? 'video' : 'image',
        title: title?.trim() || '無題',
        caption: caption,
        location: location,
        // ★ 位置情報フィールドを追加
        latitude: locationData?.latitude ?? null,
        longitude: locationData?.longitude ?? null,
        place_id: locationData?.placeId ?? null,
        place_name: locationData?.placeName ?? null,
        place_address: locationData?.placeAddress ?? null,
        tags: cleanTags,
        user_id: profileIdentifier,
        likes_count: 0,
        is_public: isPublic,
        created_at: timestamp,
      };

      const { data, error } = await supabase
        .from('cards')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // 新しいカードオブジェクトを作成
      const newCard: SnapCard = {
        id: data.id,
        imageUri: imageUrl ?? undefined,
        videoUri: videoUrl ?? undefined,
        thumbnailUrl: thumbnailUrl,
        mediaType: mediaType,
        title: title?.trim() || '無題',
        caption: caption,
        location: location,
        // ★ 位置情報を含める
        locationData: locationData,
        tags: cleanTags,
        likesCount: 0,
        createdAt: new Date(timestamp),
        userId: profileIdentifier,
        isPublic: isPublic,
      };

      // ローカルステートを更新
      setCards((prevCards) => [newCard, ...prevCards]);

      return newCard;
    } catch (error) {
      console.error('カード追加エラー:', error);
      throw error;
    }
  };

  // ファイルアップロード
  const uploadFile = async (
    uri: string,
    type: 'image' | 'video' | 'thumbnail',
    userId: string,
  ): Promise<string> => {
    try {
      const fileExtension = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const folder = type === 'video' ? 'videos' : 'images';
      const filePath = `${userId}/${folder}/${fileName}`;

      let fileData: string | ArrayBuffer;

      if (Platform.OS === 'web') {
        // Web環境: fetch経由でBlobを取得
        const response = await fetch(uri);
        const blob = await response.blob();
        fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to read file as ArrayBuffer'));
            }
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });
      } else {
        // ネイティブ環境: FileSystem経由でbase64を取得
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileData = decode(base64);
      }

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, fileData, {
          contentType: type === 'video' ? 'video/mp4' : 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('media').getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('ファイルアップロードエラー:', error);
      throw error;
    }
  };

  // カード更新
  const updateCard = async (cardId: string, updates: Partial<SnapCard>) => {
    try {
      // データベース用にキー名を変換
      const dbUpdates: Record<string, unknown> = {};

      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;
      if (updates.likesCount !== undefined) dbUpdates.likes_count = updates.likesCount;

      // ★ 位置情報の更新
      if (updates.locationData !== undefined) {
        if (updates.locationData === null) {
          // 位置情報を削除
          dbUpdates.latitude = null;
          dbUpdates.longitude = null;
          dbUpdates.place_id = null;
          dbUpdates.place_name = null;
          dbUpdates.place_address = null;
        } else {
          // 位置情報を更新
          dbUpdates.latitude = updates.locationData.latitude;
          dbUpdates.longitude = updates.locationData.longitude;
          dbUpdates.place_id = updates.locationData.placeId ?? null;
          dbUpdates.place_name = updates.locationData.placeName ?? null;
          dbUpdates.place_address = updates.locationData.placeAddress ?? null;
        }
      }

      const { error } = await supabase
        .from('cards')
        .update(dbUpdates)
        .eq('id', cardId);

      if (error) throw error;

      // ローカルステートを更新
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === cardId ? { ...card, ...updates } : card,
        ),
      );
    } catch (error) {
      console.error('カード更新エラー:', error);
      throw error;
    }
  };

  // カード削除
  const deleteCard = async (cardId: string) => {
    try {
      const card = cards.find((c) => c.id === cardId);
      if (!card) throw new Error('カードが見つかりません');

      // Supabase Storageからメディアファイルを削除
      const profileIdentifier = profile?.id ?? user?.id;
      if (!profileIdentifier) throw new Error('ユーザー情報が見つかりません');

      if (card.imageUri) {
        await deleteFile(card.imageUri, profileIdentifier);
      }

      if (card.videoUri) {
        await deleteFile(card.videoUri, profileIdentifier);
      }

      if (card.thumbnailUrl && card.mediaType === 'video') {
        await deleteFile(card.thumbnailUrl, profileIdentifier);
      }

      // データベースからカードを削除
      const { error } = await supabase.from('cards').delete().eq('id', cardId);

      if (error) throw error;

      // ローカルステートを更新
      setCards((prevCards) => prevCards.filter((card) => card.id !== cardId));
    } catch (error) {
      console.error('カード削除エラー:', error);
      throw error;
    }
  };

  // ファイル削除
  const deleteFile = async (fileUrl: string, userId: string) => {
    try {
      // URLからファイルパスを抽出
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex((part) => part === 'media');
      if (bucketIndex === -1) return;

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabase.storage.from('media').remove([filePath]);

      if (error) {
        console.warn('ファイル削除エラー:', error);
      }
    } catch (error) {
      console.warn('ファイル削除処理エラー:', error);
    }
  };

  // カード再取得
  const refreshCards = async () => {
    await fetchCards();
  };

  // IDでカードを取得
  const getCardById = (cardId: string): SnapCard | undefined => {
    return cards.find((card) => card.id === cardId);
  };

  const value = {
    cards,
    loading,
    addCard,
    updateCard,
    deleteCard,
    refreshCards,
    getCardById,
  };

  return <SnapCardContext.Provider value={value}>{children}</SnapCardContext.Provider>;
};

export const useSnapCardContext = () => {
  const context = useContext(SnapCardContext);
  if (context === undefined) {
    throw new Error('useSnapCardContext must be used within a SnapCardProvider');
  }
  return context;
};
