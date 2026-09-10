// components/chat/ChatWindow.tsx
import React, { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useChatContext } from '../../context/ChatContext';
import { MessageBubble } from './MessageBubble';

export function ChatWindow() {
  const { currentConversation, setCurrentConversation, refetchConversations } = useChatContext();
  const { messages, loading, isStreaming, error, sendMessage } = useChat(
    currentConversation?.id,
    (newId: string) => {
      // When the backend creates a new thread, update the context
      setCurrentConversation({
        id: newId,
        title: 'New Chat',
        createdAt: new Date().toISOString(),
      });
    },
    () => {
      // Refetch sidebar conversations when streaming completes
      refetchConversations();
    }
  );

  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const textToSend = input;
    setInput('');
    await sendMessage(textToSend);
  };

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">Loading messages…</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            {currentConversation ? 'No messages yet' : 'Start a new chat'}
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && idx === messages.length - 1}
          />
        ))}
        {error && (
          <div className="text-red-500 text-center p-2 bg-red-50 rounded border border-red-200">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t p-4 flex gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading || isStreaming}
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          disabled={loading || isStreaming || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}