import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConversationThread } from '../services/chatService';

interface ChatContextType {
  currentConversation: ConversationThread | null;
  setCurrentConversation: (conv: ConversationThread | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [currentConversation, setCurrentConversation] = useState<ConversationThread | null>(null);
  return (
    <ChatContext.Provider value={{ currentConversation, setCurrentConversation }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within a ChatProvider');
  return ctx;
};