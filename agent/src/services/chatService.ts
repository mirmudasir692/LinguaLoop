// services/chatService.ts
import api from '../utils/api';
import { getErrorMessage } from './authService';
import { getToken } from '../utils/storage';   // 👈 your existing token helper

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  threadId?: string;
}

export interface ConversationThread {
  id: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const chatService = {
  /**
   * Sends a message and streams the response chunks using native fetch (SSE).
   * Calls onChunk for each received chunk.
   */
  async sendMessageStream(
    message: string,
    conversationId: string | undefined,
    onChunk: (chunk: string) => void,
    onConversationId?: (id: string) => void
  ): Promise<void> {
    const token = getToken(); 
    const baseURL = api.defaults.baseURL || '';
    const url = `${baseURL}/api/agent/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, conversationId }),
    });

    if (!response.ok) {
      let errorMsg = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
               if (parsed.conversationId) {
                  onConversationId?.(parsed.conversationId);
                  continue; 
        }
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // ignore incomplete or non‑JSON lines
            }
          }
        }
      }
    }
  },

  /**
   * Convenience method that sends a message and returns the full response as a string.
   * Internally uses sendMessageStream and accumulates chunks.
   */
  async sendMessage(message: string, conversationId?: string): Promise<string> {
    let fullText = '';
    let newConversationId = conversationId || ''; 
    await this.sendMessageStream(message, conversationId, (chunk) => {
      fullText += chunk;
    }, (id) => { newConversationId = id; });
    return fullText || 'I processed your request successfully.';
  },

  /**
   * Fetches suggested prompts for a new/empty conversation.
   */
  async getSuggestions(): Promise<string[]> {
    try {
      const response = await api.get('/api/agent/suggestions');
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Fetches all messages for a given conversation (or the current one).
   */
  async getMessages(conversationId?: string): Promise<ChatMessage[]> {
    try {
      const url = conversationId
        ? `/api/agent/conversations/${conversationId}/messages`
        : '/api/agent/messages';

      const response = await api.get(url);
      if (!response.data || !response.data.success) {
        return [];
      }

      const rawMessages = response.data.data;
      if (!Array.isArray(rawMessages)) return [];

      return rawMessages.map((m: any) => {
        let text = '';
        if (typeof m.content === 'string') {
          text = m.content;
        } else if (m.content?.content && typeof m.content.content === 'string') {
          text = m.content.content;
        } else if (Array.isArray(m.content?.parts) && m.content.parts[0]?.text) {
          text = m.content.parts[0].text;
        }

        return {
          id: m.id || m._id || String(Math.random()),
          role: m.role || 'assistant',
          content: text || '',
          createdAt: m.createdAt || new Date().toISOString(),
          threadId: m.threadId,
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Fetches the list of conversation threads for the current user.
   */
  async getConversations(): Promise<ConversationThread[]> {
    try {
      const response = await api.get('/api/agent/conversations');
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch {
      return [];
    }
  },
};

export default chatService;