export interface DmConversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  // 拡張フィールド（JOIN時に取得）
  other_user?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    username: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

export interface DmParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  created_at: string;
}

export interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  // 拡張フィールド
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface DmContextType {
  conversations: DmConversation[];
  currentConversation: DmConversation | null;
  messages: DmMessage[];
  loading: boolean;
  error: string | null;
  
  // 会話関連
  fetchConversations: () => Promise<void>;
  getOrCreateConversation: (otherUserId: string) => Promise<string>;
  
  // メッセージ関連
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markMessagesAsRead: (conversationId: string) => Promise<void>;
  
  // リアルタイム
  subscribeToConversation: (conversationId: string) => void;
  unsubscribeFromConversation: () => void;
}