// components/chat/ChatWindow.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useChatContext } from '../../context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { useVoiceChat } from '../../hooks/useVoiceChat';
import { VoiceChatUI } from '../VoiceChatUI';
import { Phone, PhoneOff, Mic, Send } from 'lucide-react';

export function ChatWindow() {
  const { currentConversation, setCurrentConversation, refetchConversations } = useChatContext();
  const { messages, loading, isStreaming, error, sendMessage } = useChat(
    currentConversation?.id,
    (newId: string) => {
      setCurrentConversation({
        id: newId,
        title: 'New Chat',
        createdAt: new Date().toISOString(),
      });
    },
    () => {
      refetchConversations();
    }
  );

  const {
    isConnected,
    isCallActive,
    isAiSpeaking,
    availableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    startCall,
    endCall,
  } = useVoiceChat('ws://localhost:5000/audio-stream', {
    conversationId: currentConversation?.id,
  });

  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const textToSend = input;
    setInput('');
    await sendMessage(textToSend);
  };

  const toggleCall = () => {
    if (isCallActive) {
      endCall();
      setShowVoicePanel(false);
    } else {
      setShowVoicePanel(true);
      startCall();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <div className="border-b px-6 py-3 flex items-center justify-between bg-white shadow-2xs">
        <div>
          <h1 className="text-base font-semibold text-gray-800">
            {currentConversation?.title || 'LinguaLoop Chat'}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-500 font-medium">
              {isConnected ? 'Voice WebSocket Ready' : 'WebSocket Connecting...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {availableVoices.length > 0 && (
            <select
              value={selectedVoiceId}
              onChange={(e) => setSelectedVoiceId(e.target.value)}
              disabled={isCallActive}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {availableVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  🎙️ {voice.name || voice.id}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={toggleCall}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${isCallActive
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20 animate-pulse'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20'
              }`}
          >
            {isCallActive ? (
              <>
                <PhoneOff size={15} />
                <span>End Call</span>
              </>
            ) : (
              <>
                <Phone size={15} />
                <span>Start Voice Call</span>
              </>
            )}
          </button>
        </div>
      </div>

      {(showVoicePanel || isCallActive) && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/40 border-b border-blue-100 flex justify-center">
          <VoiceChatUI
            isConnected={isConnected}
            isCallActive={isCallActive}
            isAiSpeaking={isAiSpeaking}
            onStartCall={startCall}
            onEndCall={() => {
              endCall();
              setShowVoicePanel(false);
            }}
            availableVoices={availableVoices}
            selectedVoiceId={selectedVoiceId}
            onSelectVoiceId={setSelectedVoiceId}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">Loading messages…</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            {currentConversation ? 'No messages yet' : 'Start a new chat or initiate a Voice Call!'}
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

      <form onSubmit={handleSend} className="border-t p-4 flex items-center gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          disabled={loading || isStreaming}
        />

        <button
          type="button"
          onClick={toggleCall}
          title={isCallActive ? 'End Call' : 'Start Voice Call'}
          className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${isCallActive
              ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
            }`}
        >
          {isCallActive ? <PhoneOff size={18} /> : <Mic size={18} />}
        </button>

        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm flex items-center gap-1.5"
          disabled={loading || isStreaming || !input.trim()}
        >
          <span>Send</span>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}