import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DmConversation, DmMessage, DmContextType } from '../types/dm';
import { RealtimeChannel } from '@supabase/supabase-js';

const DmContext = createContext<DmContextType | undefined>(undefined);

export const DmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const activeProfileId = profile?.id ?? user?.id ?? null;
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<DmConversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // 会話一覧を取得
  const fetchConversations = useCallback(async () => {
    if (!activeProfileId) {
      console.log('No activeProfileId, skipping fetchConversations');
      setConversations([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching conversations for user:', activeProfileId);

      // Step 1: 自分が参加している会話IDを取得
      const { data: participantData, error: participantError } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', activeProfileId);

      if (participantError) {
        console.error('Participant error:', participantError);
        throw participantError;
      }

      console.log('Participant data:', participantData);

      if (!participantData || participantData.length === 0) {
        console.log('No conversations found');
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);
      console.log('Conversation IDs:', conversationIds);

      // Step 2: 会話の詳細を取得
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('dm_conversations')
        .select('*')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (conversationsError) {
        console.error('Conversations error:', conversationsError);
        throw conversationsError;
      }

      console.log('Conversations data:', conversationsData);

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Step 3: 各会話の相手ユーザーと最新メッセージを取得
      const enrichConversation = async (conv: DmConversation) => {
        try {
          const [
            otherParticipantsRes,
            lastMessageRes,
            unreadCountRes,
          ] = await Promise.all([
            supabase
              .from('dm_participants')
              .select('user_id')
              .eq('conversation_id', conv.id)
              .neq('user_id', activeProfileId),
            supabase
              .from('dm_messages')
              .select('content, created_at, sender_id')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('dm_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('is_read', false)
              .neq('sender_id', activeProfileId),
          ]);

          const otherParticipants = otherParticipantsRes.data;
          if (!otherParticipants || otherParticipants.length === 0) {
            return null;
          }

          const otherUserId = otherParticipants[0].user_id;

          const profileDataResult = await supabase
            .from('user_profiles')
            .select('id, display_name, avatar_url, username')
            .eq('id', otherUserId)
            .single();

          if (profileDataResult.error || !profileDataResult.data) {
            console.error('Error fetching profile:', profileDataResult.error);
            return null;
          }

          const unreadCount =
            unreadCountRes.count ?? unreadCountRes.data?.length ?? 0;

          return {
            ...conv,
            other_user: profileDataResult.data,
            last_message: lastMessageRes.data || undefined,
            unread_count: unreadCount,
          };
        } catch (err) {
          console.error('Error enriching conversation:', err);
          return null;
        }
      };

      const enrichedConversationsResults = await Promise.all(
        conversationsData.map(enrichConversation),
      );

      const enrichedConversations = enrichedConversationsResults.filter(
        (conv): conv is DmConversation => Boolean(conv),
      );

      console.log('Enriched conversations:', enrichedConversations);
      setConversations(enrichedConversations);
    } catch (err) {
      console.error('Error in fetchConversations:', err);
      setError('会話の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [activeProfileId]);

  // 会話を取得または新規作成
  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string> => {
    if (!activeProfileId) throw new Error('Not authenticated');
    if (!otherUserId || otherUserId === activeProfileId) {
      throw new Error('無効なユーザーです');
    }

    try {
      // 既存の会話を検索
      const { data: myParticipants } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', activeProfileId);

      if (myParticipants && myParticipants.length > 0) {
        const conversationIds = myParticipants.map(p => p.conversation_id);

        const { data: otherUserParticipants } = await supabase
          .from('dm_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', conversationIds);

        if (otherUserParticipants && otherUserParticipants.length > 0) {
          return otherUserParticipants[0].conversation_id;
        }
      }

      // 新規会話を作成
      const { data: newConversation, error: convError } = await supabase
        .from('dm_conversations')
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // 参加者を追加
      const { error: participantsError } = await supabase
        .from('dm_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: activeProfileId },
          { conversation_id: newConversation.id, user_id: otherUserId },
        ]);

      if (participantsError) throw participantsError;

      return newConversation.id;
    } catch (err) {
      console.error('Error getting/creating conversation:', err);
      throw err;
    }
  }, [activeProfileId]);

  // メッセージを取得
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!activeProfileId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: messagesData, error: messagesError } = await supabase
        .from('dm_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // 送信者情報を取得
      const enrichedMessages: DmMessage[] = [];
      for (const msg of messagesData) {
        const { data: senderData } = await supabase
          .from('user_profiles')
          .select('id, display_name, avatar_url')
          .eq('id', msg.sender_id)
          .single();

        enrichedMessages.push({
          ...msg,
          sender: senderData || undefined,
        });
      }

      setMessages(enrichedMessages);

      // 会話情報を設定
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setCurrentConversation(conv);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('メッセージの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [activeProfileId, conversations]);

  // メッセージを送信
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!activeProfileId || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: activeProfileId,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const senderDisplayName =
        profile?.display_name ?? profile?.username ?? user?.email ?? '自分';
      const senderAvatar = profile?.avatar_url ?? null;

      const newMessage: DmMessage = {
        ...data,
        sender: {
          id: activeProfileId,
          display_name: senderDisplayName,
          avatar_url: senderAvatar,
        },
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('メッセージの送信に失敗しました');
      throw err;
    }
  }, [activeProfileId, profile, user?.email]);

  // メッセージを既読にする
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!activeProfileId) return;

    try {
      await supabase
        .from('dm_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', activeProfileId)
        .eq('is_read', false);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [activeProfileId]);

  // リアルタイム購読
  const subscribeToConversation = useCallback((conversationId: string) => {
    if (channel) {
      channel.unsubscribe();
    }

    const newChannel = supabase
      .channel(`dm_conversation_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as DmMessage;

          const { data: senderData } = await supabase
            .from('user_profiles')
            .select('id, display_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          const enrichedMessage: DmMessage = {
            ...newMessage,
            sender: senderData || undefined,
          };

          setMessages(prev => {
            if (prev.some(m => m.id === enrichedMessage.id)) {
              return prev;
            }
            return [...prev, enrichedMessage];
          });
        }
      )
      .subscribe();

    setChannel(newChannel);
  }, [channel]);

  // リアルタイム購読解除
  const unsubscribeFromConversation = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
    }
  }, [channel]);

  // 初期ロード
  useEffect(() => {
    if (activeProfileId) {
      fetchConversations();
    }
  }, [activeProfileId, fetchConversations]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [channel]);

  const value: DmContextType = {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    fetchConversations,
    getOrCreateConversation,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    subscribeToConversation,
    unsubscribeFromConversation,
  };

  return <DmContext.Provider value={value}>{children}</DmContext.Provider>;
};

export const useDm = () => {
  const context = useContext(DmContext);
  if (context === undefined) {
    throw new Error('useDm must be used within a DmProvider');
  }
  return context;
};
