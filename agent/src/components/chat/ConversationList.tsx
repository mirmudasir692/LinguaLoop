// components/chat/ConversationList.tsx
import { useConversations } from '../../hooks/useConversations';
import { useChatContext } from '../../context/ChatContext';

interface ConversationListProps {
  onNewChat: () => void;
}

export function ConversationList({ onNewChat }: ConversationListProps) {
  const { conversations, loading, error } = useConversations();
  const { currentConversation, setCurrentConversation } = useChatContext();

  return (
    <div className="w-64 border-r p-4 flex flex-col h-full">
      <button
        onClick={onNewChat}
        className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        + New Chat
      </button>
      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-gray-500">Loading…</p>}
        {error && <p className="text-red-500">{error}</p>}
        <ul className="space-y-1">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              onClick={() => setCurrentConversation(conv)}
              className={`p-2 cursor-pointer hover:bg-gray-100 rounded ${
                currentConversation?.id === conv.id ? 'bg-gray-200' : ''
              }`}
            >
              {conv.title || 'Untitled'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}