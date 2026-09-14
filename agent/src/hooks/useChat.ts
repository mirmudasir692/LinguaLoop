// hooks/useChat.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import chatService, { ChatMessage } from '../services/chatService';

export function useChat(
  conversationId?: string,
  onNewConversation?: (id: string) => void,
  onChatComplete?: () => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track new conversation ID created during an in-flight send request
  const inFlightNewIdRef = useRef<string | null>(null);

  const loadMessages = useCallback(async (id?: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!id) {
        setMessages([]);
        return;
      }
      const msgs = await chatService.getMessages(id);
      setMessages(msgs);
    } catch (err: unknown) {
      const errObj = err as Error;
      setError(errObj.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (conversationId && conversationId === inFlightNewIdRef.current) {
      // Skip loading messages from backend while this newly created chat is actively streaming
      return;
    }
    loadMessages(conversationId);
  }, [conversationId, loadMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setError(null);

      // Optimistic user message
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
        threadId: conversationId,
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setIsStreaming(true);

      // Placeholder for the assistant's streaming message
      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
          threadId: conversationId,
        },
      ]);

      try {
        await chatService.sendMessageStream(
          text,
          conversationId,
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m))
            );
          },
          (newId) => {
            if (newId) {
              inFlightNewIdRef.current = newId;
              onNewConversation?.(newId);
            }
          }
        );
      } catch (err: unknown) {
        const errObj = err as Error;
        setError(errObj.message || 'Failed to send message');
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempUserMsg.id && m.id !== assistantMsgId)
        );
      } finally {
        setIsStreaming(false);
        inFlightNewIdRef.current = null;
        onChatComplete?.();
      }
    },
    [conversationId, onNewConversation, onChatComplete]
  );

  return { messages, loading, isStreaming, error, sendMessage, loadMessages };
}
