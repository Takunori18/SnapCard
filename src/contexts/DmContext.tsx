import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DmConversation, DmMessage, DmContextType } from '../types/dm';
import { RealtimeChannel } from '@supabase/supabase-js';

const DmContext = createContext<DmContextType | undefined>(undefined);

export const DmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<DmConversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // 会話一覧を取得
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // 自分が参加している会話を取得
      const { data: participantData, error: participantError } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const conversationIds = participantData.map(p => p.conversation_id);

      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      // 会話の詳細を取得
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('dm_conversations')
        .select('*')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (conversationsError) throw conversationsError;

      // 各会話の相手ユーザーと最新メッセージを取得
      const enrichedConversations = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          // 相手ユーザーを取得
          const { data: participants } = await supabase
            .from('dm_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id)
            .single();

          let otherUser = null;
          if (participants) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url, username')
              .eq('id', participants.user_id)
              .single();

            otherUser = profileData;
          }

          // 最新メッセージを取得
          const { data: lastMessage } = await supabase
            .from('dm_messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // 未読数を取得
          const { count: unreadCount } = await supabase
            .from('dm_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            other_user: otherUser,
            last_message: lastMessage,
            unread_count: unreadCount || 0,
          };
        })
      );

      setConversations(enrichedConversations);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('会話の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 会話を取得または新規作成
  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string> => {
    if (!user?.id) throw new Error('Not authenticated');

    try {
      // 既存の会話を検索
      const { data: existingParticipants } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (existingParticipants && existingParticipants.length > 0) {
        const conversationIds = existingParticipants.map(p => p.conversation_id);

        // 相手ユーザーも含まれている会話を探す
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
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: otherUserId },
        ]);

      if (participantsError) throw participantsError;

      return newConversation.id;
    } catch (err) {
      console.error('Error getting/creating conversation:', err);
      throw err;
    }
  }, [user?.id]);

  // メッセージを取得
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data: messagesData, error: messagesError } = await supabase
        .from('dm_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // 送信者情報を取得
      const enrichedMessages = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', msg.sender_id)
            .single();

          return {
            ...msg,
            sender: senderData,
          };
        })
      );

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
  }, [user?.id, conversations]);

  // メッセージを送信
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!user?.id || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // ローカルのメッセージリストを更新
      const { data: senderData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', user.id)
        .single();

      const newMessage: DmMessage = {
        ...data,
        sender: senderData,
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('メッセージの送信に失敗しました');
      throw err;
    }
  }, [user?.id]);

  // メッセージを既読にする
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('dm_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [user?.id]);

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

          // 送信者情報を取得
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          const enrichedMessage: DmMessage = {
            ...newMessage,
            sender: senderData,
          };

          setMessages(prev => {
            // 重複チェック
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

  // 初期ロード時に会話一覧を取得
  useEffect(() => {
    if (user?.id) {
      fetchConversations();
    }
  }, [user?.id, fetchConversations]);

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