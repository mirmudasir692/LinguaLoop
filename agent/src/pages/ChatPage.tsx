// pages/ChatPage.tsx
import { ChatWindow } from '../components/chat/ChatWindow';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatProvider, useChatContext } from '../context/ChatContext';
import { useConversations } from '../hooks/useConversations';

function ChatPageContent() {
  const { setCurrentConversation } = useChatContext();
  const { refetch: refetchConversations } = useConversations();

  const startNewChat = () => {
    setCurrentConversation(null); // clears the conversation → ChatWindow will show empty state
    // Optionally refresh the list (the new chat will appear after first message)
    refetchConversations();
  };

  return (
    <div className="flex h-screen w-full">
      <ConversationList onNewChat={startNewChat} />
      <ChatWindow />
    </div>
  );
}

export function ChatPage() {
  return (
    <ChatProvider>
      <ChatPageContent />
    </ChatProvider>
  );
}