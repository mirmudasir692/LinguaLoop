import React from 'react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { VoiceChatUI } from '../components/VoiceChatUI';

export default function VoiceChatPage() {
    const {
        isConnected,
        isCallActive,
        isAiSpeaking,
        startCall,
        endCall
    } = useVoiceChat('ws://localhost:3001/audio-stream');

    return (
        <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <VoiceChatUI
                isConnected={isConnected}
                isCallActive={isCallActive}
                isAiSpeaking={isAiSpeaking}
                onStartCall={startCall}
                onEndCall={endCall}
            />
        </main>
    );
}