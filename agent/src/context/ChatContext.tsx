import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConversationThread } from '../services/chatService';
import { useConversations } from '../hooks/useConversations';

interface ChatContextType {
  currentConversation: ConversationThread | null;
  setCurrentConversation: (conv: ConversationThread | null) => void;
  conversations: ConversationThread[];
  loadingConversations: boolean;
  errorConversations: string | null;
  refetchConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [currentConversation, setCurrentConversation] = useState<ConversationThread | null>(null);
  const { conversations, loading, error, refetch } = useConversations();

  return (
    <ChatContext.Provider
      value={{
        currentConversation,
        setCurrentConversation,
        conversations,
        loadingConversations: loading,
        errorConversations: error,
        refetchConversations: refetch,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within a ChatProvider');
  return ctx;
};