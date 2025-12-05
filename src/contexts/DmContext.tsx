import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DmConversation, DmMessage, DmContextType } from '../types/dm';
import { RealtimeChannel } from '@supabase/supabase-js';

const DmContext = createContext<DmContextType | undefined>(undefined);

export const DmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const authUserId = profile?.owner_id ?? user?.id ?? null;
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<DmConversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // 会話一覧を取得
  const fetchConversations = useCallback(async () => {
    if (!authUserId) {
      console.log('No authUserId, skipping fetchConversations');
      setConversations([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching conversations for user:', authUserId);

      // Step 1: 自分が参加している会話IDを取得
      const { data: participantData, error: participantError } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', authUserId);

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
      const enrichedConversations: DmConversation[] = [];

      for (const conv of conversationsData) {
        try {
          // 相手ユーザーを取得
          const { data: otherParticipants, error: otherError } = await supabase
            .from('dm_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', authUserId);

          if (otherError) {
            console.error('Error fetching other participants:', otherError);
            continue;
          }

          if (!otherParticipants || otherParticipants.length === 0) {
            console.log('No other participants for conversation:', conv.id);
            continue;
          }

          const otherUserId = otherParticipants[0].user_id;

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, username')
            .eq('id', otherUserId)
            .single();

          if (profileError || !profileData) {
            console.error('Error fetching profile:', profileError);
            continue;
          }

          // 最新メッセージを取得
          const { data: lastMessage } = await supabase
            .from('dm_messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // 未読数を取得
          const { count: unreadCount } = await supabase
            .from('dm_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', authUserId);

          enrichedConversations.push({
            ...conv,
            other_user: profileData,
            last_message: lastMessage || undefined,
            unread_count: unreadCount || 0,
          });
        } catch (err) {
          console.error('Error enriching conversation:', err);
        }
      }

      console.log('Enriched conversations:', enrichedConversations);
      setConversations(enrichedConversations);
    } catch (err) {
      console.error('Error in fetchConversations:', err);
      setError('会話の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  // 会話を取得または新規作成
  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string> => {
    if (!authUserId) throw new Error('Not authenticated');
    if (!otherUserId || otherUserId === authUserId) {
      throw new Error('無効なユーザーです');
    }

    try {
      // 既存の会話を検索
      const { data: myParticipants } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', authUserId);

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
          { conversation_id: newConversation.id, user_id: authUserId },
          { conversation_id: newConversation.id, user_id: otherUserId },
        ]);

      if (participantsError) throw participantsError;

      return newConversation.id;
    } catch (err) {
      console.error('Error getting/creating conversation:', err);
      throw err;
    }
  }, [authUserId]);

  // メッセージを取得
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!authUserId) return;

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
          .from('profiles')
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
  }, [authUserId, conversations]);

  // メッセージを送信
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!authUserId || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: authUserId,
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
          id: authUserId,
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
  }, [authUserId, profile, user?.email]);

  // メッセージを既読にする
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!authUserId) return;

    try {
      await supabase
        .from('dm_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', authUserId)
        .eq('is_read', false);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [authUserId]);

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
            .from('profiles')
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
    if (authUserId) {
      fetchConversations();
    }
  }, [authUserId, fetchConversations]);

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