// components/chat/ChatWindow.tsx
import React, { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useChatContext } from '../../context/ChatContext';
import { ChatMessage } from '../../services/chatService';

export function ChatWindow() {
  const { currentConversation, setCurrentConversation } = useChatContext();
  const { messages, loading, isStreaming, error, sendMessage } = useChat(
    currentConversation?.id,
    (newId: string) => {
      // When the backend creates a new thread, update the context
      setCurrentConversation({
        id: newId,
        title: 'New Chat',
        createdAt: new Date().toISOString(),
      });
    }
  );

  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-500 mt-20">
            {currentConversation ? 'No messages yet' : 'Start a new chat'}
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.content || (isStreaming && msg.role === 'assistant' && '▍')}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 p-3 rounded-lg">
              <span className="animate-pulse">▍</span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-red-500 text-center p-2 bg-red-50 rounded">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading || isStreaming}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading || isStreaming || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}