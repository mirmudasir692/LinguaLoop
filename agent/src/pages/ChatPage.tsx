import { ChatWindow } from '../components/chat/ChatWindow';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatProvider, useChatContext } from '../context/ChatContext';

function ChatPageContent() {
  const { setCurrentConversation } = useChatContext();

  const startNewChat = () => {
    setCurrentConversation(null);
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