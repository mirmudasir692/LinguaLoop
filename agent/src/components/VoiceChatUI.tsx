import React from 'react';
export { VoiceTutor } from './VoiceTutor';
export type { VoiceTutorProps } from './VoiceTutor';

export interface Voice {
    id: string;
    name: string;
    gender?: string;
    language?: string;
    [key: string]: any;
}

interface VoiceChatUIProps {
    isConnected: boolean;
    isCallActive: boolean;
    isAiSpeaking: boolean;
    isProcessing?: boolean;
    isMicMuted?: boolean;
    onStartCall: () => void;
    onEndCall: () => void;
    availableVoices?: Voice[];
    selectedVoiceId?: string;
    onSelectVoiceId?: (voiceId: string) => void;
    voiceError?: string | null;
    userTranscript?: string;
    aiTranscript?: string;
    onRetryListening?: () => void;
    onClearError?: () => void;
    onInterrupt?: () => void;
}

export function VoiceChatUI({
    isConnected,
    isCallActive,
    isAiSpeaking,
    isProcessing = false,
    isMicMuted,
    onStartCall,
    onEndCall,
    availableVoices = [],
    selectedVoiceId = '',
    onSelectVoiceId,
    voiceError,
    userTranscript,
    aiTranscript,
    onRetryListening,
    onClearError,
    onInterrupt,
}: VoiceChatUIProps) {
    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-gradient-to-b from-blue-50/50 to-white rounded-2xl shadow-sm border border-blue-100 max-w-md mx-auto w-full transition-all">
            <div className="flex items-center justify-between w-full">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span>🎙️ AI Voice Call</span>
                </h2>
                <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
                    <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs font-medium text-gray-600">
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {voiceError && (
                <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-left space-y-2 text-xs text-amber-900 shadow-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <span>⚠️</span>
                        <span>Speech Recognition Notice</span>
                    </div>
                    <p className="whitespace-pre-line leading-relaxed text-amber-800 font-sans">
                        {voiceError}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                        {onRetryListening && (
                            <button
                                type="button"
                                onClick={onRetryListening}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
                            >
                                Retry Listening
                            </button>
                        )}
                        {onClearError && (
                            <button
                                type="button"
                                onClick={onClearError}
                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>
            )}

            {availableVoices.length > 0 && (
                <div className="flex items-center space-x-2 w-full justify-between bg-white/80 p-2 rounded-lg border border-gray-100">
                    <span className="text-xs font-medium text-gray-500">Select Voice:</span>
                    <select
                        value={selectedVoiceId}
                        onChange={(e) => onSelectVoiceId?.(e.target.value)}
                        disabled={isCallActive}
                        className="text-xs bg-white border border-gray-200 rounded-md px-2.5 py-1 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                    >
                        {availableVoices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                                {voice.name || voice.id} {voice.language ? `(${voice.language})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="min-h-12 flex flex-col items-center justify-center w-full space-y-2">
                {isAiSpeaking ? (
                    <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="flex items-center justify-center space-x-1.5 h-6">
                            <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            <div className="w-1.5 h-5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                            <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1.5">
                                <span>AI speaking...</span>
                                <span className="text-[10px] text-gray-500 font-normal bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">Mic auto-muted</span>
                            </span>
                            {onInterrupt && (
                                <button
                                    type="button"
                                    onClick={onInterrupt}
                                    className="text-[10px] font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                                >
                                    Interrupt
                                </button>
                            )}
                        </div>
                    </div>
                ) : isProcessing ? (
                    <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                            <span className="text-xs font-semibold text-amber-700">Thinking & preparing response...</span>
                        </div>
                        <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            🔇 Mic auto-muted
                        </span>
                    </div>
                ) : isCallActive ? (
                    <div className="flex items-center space-x-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-green-700">
                            🎤 Listening... Speak anytime
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">
                        Click "Start Call" to begin live voice conversation
                    </span>
                )}

                {userTranscript && isCallActive && (
                    <div className="text-xs bg-blue-50 text-blue-800 px-3 py-1 rounded-lg w-full text-center border border-blue-100 truncate">
                        <span className="font-semibold">You:</span> "{userTranscript}"
                    </div>
                )}
                {aiTranscript && isCallActive && (
                    <div className="text-xs bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg w-full text-center border border-indigo-100 truncate">
                        <span className="font-semibold">AI:</span> "{aiTranscript}"
                    </div>
                )}
            </div>

            <div className="flex space-x-4">
                {!isCallActive ? (
                    <button
                        onClick={onStartCall}
                        disabled={!isConnected}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        <span>Start Call</span>
                    </button>
                ) : (
                    <button
                        onClick={onEndCall}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-500/20 cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                        <span>End Call</span>
                    </button>
                )}
            </div>
        </div>
    );
}