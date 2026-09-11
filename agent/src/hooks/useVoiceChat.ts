import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';

export interface Voice {
    id: string;
    name: string;
    gender?: string;
    language?: string;
    [key: string]: any;
}

export interface AudioSettings {
    targetSampleRate?: number;
    [key: string]: any;
}

export interface UseVoiceChatOptions {
    conversationId?: string;
    userId?: string;
    initialVoiceId?: string;
}

export function useVoiceChat(
    wsUrl: string = 'ws://localhost:5000/audio-stream',
    options?: UseVoiceChatOptions
) {
    const [isConnected, setIsConnected] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);

    const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>(options?.initialVoiceId || '');
    const [audioSettings, setAudioSettings] = useState<AudioSettings | null>(null);

    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [userTranscript, setUserTranscript] = useState<string>('');
    const [aiTranscript, setAiTranscript] = useState<string>('');

    const wsRef = useRef<WebSocket | null>(null);
    const recognitionRef = useRef<any>(null);
    const isCallActiveRef = useRef<boolean>(isCallActive);
    const restartListeningTimeoutRef = useRef<any>(null);
    const consecutiveNetworkErrorsRef = useRef<number>(0);

    const selectedVoiceIdRef = useRef<string>(selectedVoiceId);
    const isAiSpeakingRef = useRef<boolean>(isAiSpeaking);
    const conversationIdRef = useRef<string | undefined>(options?.conversationId);
    const userIdRef = useRef<string | undefined>(options?.userId);

    useEffect(() => {
        isCallActiveRef.current = isCallActive;
    }, [isCallActive]);

    useEffect(() => {
        selectedVoiceIdRef.current = selectedVoiceId;
    }, [selectedVoiceId]);

    useEffect(() => {
        isAiSpeakingRef.current = isAiSpeaking;
    }, [isAiSpeaking]);

    useEffect(() => {
        conversationIdRef.current = options?.conversationId;
        userIdRef.current = options?.userId;
    }, [options?.conversationId, options?.userId]);

    // Fetch available voices & settings on initialization
    useEffect(() => {
        let isMounted = true;

        async function fetchMetadata() {
            try {
                let voicesData: any = null;
                try {
                    const res = await api.get('/api/voice/voices');
                    voicesData = res.data;
                } catch {
                    const res = await fetch('/api/voice/voices');
                    if (res.ok) voicesData = await res.json();
                }

                if (voicesData && isMounted) {
                    const voicesList: Voice[] = Array.isArray(voicesData)
                        ? voicesData
                        : (voicesData.voices || []);
                    setAvailableVoices(voicesList);
                    if (voicesList.length > 0 && !selectedVoiceIdRef.current) {
                        setSelectedVoiceId(voicesList[0].id);
                    }
                }
            } catch (error) {
                console.error('[VoiceChat] Failed to fetch voices:', error);
            }

            try {
                let settingsData: AudioSettings | null = null;
                try {
                    const res = await api.get('/api/voice/settings');
                    settingsData = res.data;
                } catch {
                    const res = await fetch('/api/voice/settings');
                    if (res.ok) settingsData = await res.json();
                }

                if (settingsData && isMounted) {
                    setAudioSettings(settingsData);
                }
            } catch (error) {
                console.error('[VoiceChat] Failed to fetch voice settings:', error);
            }
        }

        fetchMetadata();

        return () => {
            isMounted = false;
        };
    }, []);

    const buildWsUrl = useCallback((baseUrl: string, voiceId?: string) => {
        const vId = voiceId || selectedVoiceIdRef.current || selectedVoiceId;
        const cId = conversationIdRef.current;
        const uId = userIdRef.current;

        const params: Record<string, string> = {};
        if (vId) params.voiceId = vId;
        if (cId) params.conversationId = cId;
        if (uId) params.userId = uId;

        try {
            const base = baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')
                ? baseUrl
                : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${baseUrl}`;
            const url = new URL(base);
            Object.entries(params).forEach(([key, val]) => {
                if (val) url.searchParams.set(key, val);
            });
            return url.toString();
        } catch {
            const queryParams = new URLSearchParams();
            Object.entries(params).forEach(([key, val]) => {
                if (val) queryParams.set(key, val);
            });
            const sep = baseUrl.includes('?') ? '&' : '?';
            const qStr = queryParams.toString();
            return qStr ? `${baseUrl}${sep}${qStr}` : baseUrl;
        }
    }, [wsUrl, selectedVoiceId]);

    const stopAllSpeech = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
    }, []);

    const isBraveBrowser = useCallback(async (): Promise<boolean> => {
        try {
            return Boolean(
                (navigator as any).brave &&
                typeof (navigator as any).brave.isBrave === 'function' &&
                (await (navigator as any).brave.isBrave())
            );
        } catch {
            return false;
        }
    }, []);

    // Helper to start/resume speech recognition with fresh instances to avoid Chrome network error drops
    const startListening = useCallback(() => {
        if (!isCallActiveRef.current || isAiSpeakingRef.current) {
            return;
        }

        if (restartListeningTimeoutRef.current) {
            clearTimeout(restartListeningTimeoutRef.current);
            restartListeningTimeoutRef.current = null;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) { }
            recognitionRef.current = null;
        }

        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRec) {
            setVoiceError('Web Speech API is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
            return;
        }

        try {
            const recognition = new SpeechRec();
            // continuous: false allows each spoken sentence to finish cleanly without hanging connections
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            let currentFinal = '';
            let currentInterim = '';
            let hasSentChunk = false;

            recognition.onstart = () => {
                console.log('[VoiceChat] Speech recognition listening started');
            };

            recognition.onspeechstart = () => {
                if (isAiSpeakingRef.current) {
                    console.log('[VoiceChat] User speech started during playback, interrupting AI...');
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'INTERRUPT' }));
                    }
                    stopAllSpeech();
                }
            };

            recognition.onresult = (event: any) => {
                currentFinal = '';
                currentInterim = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i];
                    const transcript = res[0]?.transcript || '';
                    if (res.isFinal) {
                        currentFinal += transcript + ' ';
                    } else {
                        currentInterim += transcript;
                    }
                }

                const textToProcess = (currentFinal || currentInterim).trim();

                if (textToProcess) {
                    setUserTranscript(textToProcess);
                    setVoiceError(null);
                    consecutiveNetworkErrorsRef.current = 0;
                }

                if (textToProcess && isAiSpeakingRef.current) {
                    console.log('[VoiceChat] User speech detected during AI playback, interrupting AI...');
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'INTERRUPT' }));
                    }
                    stopAllSpeech();
                }

                // If this utterance produced a final chunk, send immediately
                if (currentFinal.trim()) {
                    const finalSentence = currentFinal.trim();
                    currentFinal = '';
                    currentInterim = '';
                    hasSentChunk = true;
                    console.log(`[VoiceChat] User sentence sent to server: "${finalSentence}"`);
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({
                            type: 'USER_SPEECH',
                            sentence: finalSentence,
                            text: finalSentence,
                        }));
                    }
                }
            };

            recognition.onerror = async (err: any) => {
                const errorType = err?.error;
                console.warn('[VoiceChat] Speech recognition notice:', errorType);

                if (errorType === 'no-speech') {
                    // Harmless pause in speech
                    return;
                }

                if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
                    setVoiceError('Microphone permission denied. Please allow microphone access in your browser settings.');
                    return;
                }

                if (errorType === 'network') {
                    consecutiveNetworkErrorsRef.current += 1;
                    const isBrave = await isBraveBrowser();
                    if (isBrave) {
                        setVoiceError(
                            "Brave Browser blocks Google Speech Recognition by default.\n" +
                            "To fix: Open brave://settings/privacy, enable 'Use Google services for push messaging and speech recognition', and reload this page (or open in Google Chrome)."
                        );
                    } else {
                        setVoiceError(
                            "Speech recognition network error: could not connect to speech service. Ensure your internet is active or try Google Chrome."
                        );
                    }
                }
            };

            recognition.onend = () => {
                // If there was pending interim text that didn't get marked final before ending, send it now
                const remaining = (currentFinal || currentInterim).trim();
                if (remaining && !hasSentChunk && wsRef.current?.readyState === WebSocket.OPEN) {
                    console.log(`[VoiceChat] Sending user sentence on utterance end: "${remaining}"`);
                    setUserTranscript(remaining);
                    wsRef.current.send(JSON.stringify({
                        type: 'USER_SPEECH',
                        sentence: remaining,
                        text: remaining,
                    }));
                }

                currentFinal = '';
                currentInterim = '';

                // Restart fresh recognition cycle if call is active and AI is not speaking
                if (isCallActiveRef.current && !isAiSpeakingRef.current) {
                    // Pause rapid looping if there are consecutive network errors to prevent spamming
                    if (consecutiveNetworkErrorsRef.current >= 3) {
                        console.warn('[VoiceChat] Auto-restart paused due to persistent network errors. Click Retry to reconnect.');
                        return;
                    }

                    const delay = consecutiveNetworkErrorsRef.current > 0 ? 1500 : 120;
                    restartListeningTimeoutRef.current = setTimeout(() => {
                        startListening();
                    }, delay);
                }
            };

            recognition.start();
            recognitionRef.current = recognition;
        } catch (error) {
            console.warn('[VoiceChat] Recognition start error:', error);
            if (isCallActiveRef.current && !isAiSpeakingRef.current) {
                restartListeningTimeoutRef.current = setTimeout(() => {
                    startListening();
                }, 500);
            }
        }
    }, [stopAllSpeech, isBraveBrowser]);

    const connectWebSocket = useCallback((voiceId?: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        const fullWsUrl = buildWsUrl(wsUrl, voiceId);
        const ws = new WebSocket(fullWsUrl);

        ws.onopen = () => {
            console.log('[VoiceChat] WebSocket connected');
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log('[VoiceChat] WebSocket disconnected');
            setIsConnected(false);
        };

        ws.onerror = (err) => console.error('[VoiceChat] WebSocket error:', err);

        ws.onmessage = (event) => {
            if (typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'AI_SPEECH' && data.text) {
                        console.log(`[VoiceChat] AI speech received: "${data.text}"`);
                        setAiTranscript(data.text);

                        if ('speechSynthesis' in window) {
                            const utterance = new SpeechSynthesisUtterance(data.text);
                            utterance.lang = 'en-US';

                            utterance.onstart = () => {
                                setIsAiSpeaking(true);
                                isAiSpeakingRef.current = true;
                                if (recognitionRef.current) {
                                    try { recognitionRef.current.abort(); } catch (e) { }
                                    recognitionRef.current = null;
                                }
                            };

                            const handleDone = () => {
                                setIsAiSpeaking(false);
                                isAiSpeakingRef.current = false;
                                if (isCallActiveRef.current) {
                                    setTimeout(() => {
                                        if (isCallActiveRef.current && !isAiSpeakingRef.current) {
                                            startListening();
                                        }
                                    }, 200);
                                }
                            };

                            utterance.onend = handleDone;
                            utterance.onerror = handleDone;
                            window.speechSynthesis.speak(utterance);
                        }
                    }
                } catch {
                    console.log('[VoiceChat] Non-JSON message received:', event.data);
                }
            }
        };

        wsRef.current = ws;
        return ws;
    }, [wsUrl, buildWsUrl, startListening]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connectWebSocket]);

    // Start Call
    const startCall = useCallback(async () => {
        try {
            setVoiceError(null);
            consecutiveNetworkErrorsRef.current = 0;

            // 1. Verify microphone permissions first
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    testStream.getTracks().forEach((track) => track.stop());
                } catch (micErr: any) {
                    console.error('[VoiceChat] Microphone permission denied:', micErr);
                    setVoiceError('Microphone permission denied. Please allow microphone access in your browser settings.');
                    return;
                }
            }

            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                connectWebSocket();
            }

            const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRec) {
                setVoiceError('Your browser does not support Web Speech API. Please use Google Chrome, Edge, or Safari.');
                return;
            }

            setIsCallActive(true);
            isCallActiveRef.current = true;
            startListening();
        } catch (error: any) {
            console.error('[VoiceChat] Failed to start call:', error);
            setVoiceError(`Failed to start call: ${error?.message || error}`);
        }
    }, [connectWebSocket, startListening]);

    const endCall = useCallback(() => {
        setIsCallActive(false);
        isCallActiveRef.current = false;
        stopAllSpeech();
        consecutiveNetworkErrorsRef.current = 0;

        if (restartListeningTimeoutRef.current) {
            clearTimeout(restartListeningTimeoutRef.current);
            restartListeningTimeoutRef.current = null;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) { }
            recognitionRef.current = null;
        }
    }, [stopAllSpeech]);

    const retryListening = useCallback(() => {
        consecutiveNetworkErrorsRef.current = 0;
        setVoiceError(null);
        if (isCallActiveRef.current) {
            startListening();
        } else {
            startCall();
        }
    }, [startListening, startCall]);

    return {
        isConnected,
        isCallActive,
        isAiSpeaking,
        availableVoices,
        selectedVoiceId,
        setSelectedVoiceId,
        audioSettings,
        voiceError,
        userTranscript,
        aiTranscript,
        startCall,
        endCall,
        retryListening,
        clearVoiceError: () => setVoiceError(null),
    };
}