import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { readUriAsArrayBuffer } from '../utils/file';

const META_PREFIX = '__meta:';
const META_X = `${META_PREFIX}x=`;
const META_Y = `${META_PREFIX}y=`;
const META_FONT = `${META_PREFIX}font=`;
const META_OVERLAYS = `${META_PREFIX}overlays=`;

interface StoryPosition {
  x: number;
  y: number;
}

export interface StoryTextOverlay {
  id: string;
  text: string;
  color: string;
  fontSize: number;
  fontFamily?: string;
  backgroundColor?: string;
  xRatio: number;
  yRatio: number;
}

export interface Story {
  id: string;
  userId: string;
  imageUri: string;
  text?: string;
  textColor?: string;
  textSize?: string;
  backgroundColor?: string;
  tags: string[];
  textPosition?: StoryPosition;
  textFont?: string;
  textOverlays?: StoryTextOverlay[];
  createdAt: Date;
  expiresAt: Date; // 24時間後
  viewCount: number;
}

type NewStoryInput = Omit<Story, 'id' | 'createdAt' | 'expiresAt' | 'viewCount'>;

interface StoryContextType {
  stories: Story[];
  addStory: (story: NewStoryInput) => Promise<void>;
  deleteStory: (id: string) => Promise<void>;
  getUserStories: (userId: string) => Story[];
  loading: boolean;
  uploadImage: (uri: string) => Promise<string | null>;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

const extractStoryMetadata = (tags: string[] = []) => {
  const cleanTags: string[] = [];
  let position: StoryPosition | undefined;
  let font: string | undefined;
  let overlays: StoryTextOverlay[] | undefined;

  tags.forEach(tag => {
    if (tag.startsWith(META_X)) {
      const value = parseFloat(tag.replace(META_X, ''));
      if (!Number.isNaN(value)) {
        position = position ?? { x: 0.5, y: 0.6 };
        position.x = value;
      }
      return;
    }

    if (tag.startsWith(META_Y)) {
      const value = parseFloat(tag.replace(META_Y, ''));
      if (!Number.isNaN(value)) {
        position = position ?? { x: 0.5, y: 0.6 };
        position.y = value;
      }
      return;
    }

    if (tag.startsWith(META_FONT)) {
      font = tag.replace(META_FONT, '');
      return;
    }

    if (tag.startsWith(META_OVERLAYS)) {
      try {
        const payload = decodeURIComponent(tag.replace(META_OVERLAYS, ''));
        overlays = JSON.parse(payload);
      } catch (error) {
        console.warn('overlay parse error', error);
      }
      return;
    }

    cleanTags.push(tag);
  });

  return { cleanTags, position, font, overlays };
};

const buildMetadataTags = (position?: StoryPosition, font?: string, overlays?: StoryTextOverlay[]) => {
  const metaTags: string[] = [];
  if (position) {
    metaTags.push(`${META_X}${position.x.toFixed(3)}`);
    metaTags.push(`${META_Y}${position.y.toFixed(3)}`);
  }
  if (font) {
    metaTags.push(`${META_FONT}${font}`);
  }
  if (overlays?.length) {
    metaTags.push(`${META_OVERLAYS}${encodeURIComponent(JSON.stringify(overlays))}`);
  }
  return metaTags;
};

export const StoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStories();
    // 24時間ごとに期限切れのストーリーを削除
    const interval = setInterval(deleteExpiredStories, 60000); // 1分ごとにチェック
    return () => clearInterval(interval);
  }, []);

  const loadStories = async () => {
    try {
      const { data: supabaseStories, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase読み込みエラー:', error);
      } else if (supabaseStories) {
        const storiesWithDates = supabaseStories.map((story: any) => {
          const { cleanTags, position, font, overlays } = extractStoryMetadata(story.tags || []);
          return {
            id: story.id,
            userId: story.user_id,
            imageUri: story.image_url,
            text: story.text,
            textColor: story.text_color,
            textSize: story.text_size,
            backgroundColor: story.background_color,
            tags: cleanTags,
            textPosition: position,
            textFont: font,
            textOverlays: overlays,
            createdAt: new Date(story.created_at),
            expiresAt: new Date(story.expires_at),
            viewCount: story.view_count || 0,
          } as Story;
        });
        setStories(storiesWithDates);
      }
    } catch (error) {
      console.error('ストーリー読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpiredStories = async () => {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('stories')
        .delete()
        .lt('expires_at', now);
      
      // ローカルステートも更新
      setStories(prev => prev.filter(story => story.expiresAt > new Date()));
    } catch (error) {
      console.error('期限切れストーリー削除エラー:', error);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `stories/${fileName}`;

      if (uri.startsWith('file://')) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('ファイルが存在しません');
        }
      }

      const fileBuffer = await readUriAsArrayBuffer(uri);

      const { data, error } = await supabase.storage
        .from('card-images')
        .upload(filePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('画像アップロードエラー:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('card-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('画像処理エラー:', error);
      return null;
    }
  };

  const addStory = async (storyData: NewStoryInput) => {
    try {
      let imageUrl = storyData.imageUri;
      
      if (storyData.imageUri.startsWith('file://') || storyData.imageUri.startsWith('blob:')) {
        const uploadedUrl = await uploadImage(storyData.imageUri);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24時間後

      const sanitizedTags = (storyData.tags || []).filter(tag => !tag.startsWith(META_PREFIX));
      const metaTags = buildMetadataTags(storyData.textPosition, storyData.textFont, storyData.textOverlays);
      const combinedTags = [...sanitizedTags, ...metaTags];

      const { data, error } = await supabase
        .from('stories')
        .insert([
          {
            user_id: storyData.userId,
            image_url: imageUrl,
            text: storyData.text,
            text_color: storyData.textColor,
            text_size: storyData.textSize,
            background_color: storyData.backgroundColor,
            tags: combinedTags,
            expires_at: expiresAt.toISOString(),
            view_count: 0,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const { cleanTags, position, font, overlays } = extractStoryMetadata(data.tags || []);

      const newStory: Story = {
        id: data.id,
        userId: data.user_id,
        imageUri: data.image_url,
        text: data.text,
        textColor: data.text_color,
        textSize: data.text_size,
        backgroundColor: data.background_color,
        tags: cleanTags,
        textPosition: position,
        textFont: font,
        textOverlays: overlays,
        createdAt: new Date(data.created_at),
        expiresAt: new Date(data.expires_at),
        viewCount: data.view_count || 0,
      };

      setStories(prev => [newStory, ...prev]);
    } catch (error) {
      console.error('ストーリー追加エラー:', error);
      throw error;
    }
  };

  const deleteStory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase削除エラー:', error);
      }

      setStories(prev => prev.filter(story => story.id !== id));
    } catch (error) {
      console.error('ストーリー削除エラー:', error);
    }
  };

  const getUserStories = (userId: string) => {
    return stories.filter(story => story.userId === userId);
  };

  return (
    <StoryContext.Provider 
      value={{ stories, addStory, deleteStory, getUserStories, loading, uploadImage }}
    >
      {children}
    </StoryContext.Provider>
  );
};

export const useStoryContext = () => {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStoryContext must be used within StoryProvider');
  }
  return context;
};
