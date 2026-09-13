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
    const [isProcessing, setIsProcessing] = useState(false);

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
    const watchdogTimeoutRef = useRef<any>(null);
    const consecutiveNetworkErrorsRef = useRef<number>(0);

    const selectedVoiceIdRef = useRef<string>(selectedVoiceId);
    const isAiSpeakingRef = useRef<boolean>(isAiSpeaking);
    const isProcessingRef = useRef<boolean>(isProcessing);
    const conversationIdRef = useRef<string | undefined>(options?.conversationId);
    const userIdRef = useRef<string | undefined>(options?.userId);

    const audioQueueRef = useRef<Blob[]>([]);
    const isPlayingAudioRef = useRef<boolean>(false);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentAudioUrlRef = useRef<string | null>(null);
    const isTurnCompleteRef = useRef<boolean>(false);
    const startListeningRef = useRef<() => void>(() => {});

    const silenceTimerRef = useRef<any>(null);
    const accumulatedTranscriptRef = useRef<string>('');
    const baseTranscriptRef = useRef<string>('');

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
        isProcessingRef.current = isProcessing;
    }, [isProcessing]);

    useEffect(() => {
        conversationIdRef.current = options?.conversationId;
        userIdRef.current = options?.userId;
    }, [options?.conversationId, options?.userId]);

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

    const clearWatchdog = useCallback(() => {
        if (watchdogTimeoutRef.current) {
            clearTimeout(watchdogTimeoutRef.current);
            watchdogTimeoutRef.current = null;
        }
    }, []);

    const clearSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }, []);

    const stopAllSpeech = useCallback(() => {
        if (currentAudioRef.current) {
            try {
                currentAudioRef.current.pause();
                currentAudioRef.current.currentTime = 0;
                currentAudioRef.current.onended = null;
                currentAudioRef.current.onerror = null;
                currentAudioRef.current.src = '';
            } catch (e) { }
            currentAudioRef.current = null;
        }

        if (currentAudioUrlRef.current) {
            URL.revokeObjectURL(currentAudioUrlRef.current);
            currentAudioUrlRef.current = null;
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        audioQueueRef.current = [];
        isPlayingAudioRef.current = false;
        isTurnCompleteRef.current = true;
        clearWatchdog();
        clearSilenceTimer();
        accumulatedTranscriptRef.current = '';
        baseTranscriptRef.current = '';
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        setIsProcessing(false);
        isProcessingRef.current = false;
    }, [clearWatchdog, clearSilenceTimer]);

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

    const finishAiTurn = useCallback(() => {
        console.log('[VoiceChat] All queued AI audio playback completed, unmuting microphone...');
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        setIsProcessing(false);
        isProcessingRef.current = false;
        clearWatchdog();
        clearSilenceTimer();
        accumulatedTranscriptRef.current = '';
        baseTranscriptRef.current = '';

        if (isCallActiveRef.current) {
            setTimeout(() => {
                if (isCallActiveRef.current && !isAiSpeakingRef.current && !isProcessingRef.current) {
                    startListeningRef.current();
                }
            }, 300);
        }
    }, [clearWatchdog, clearSilenceTimer]);

    // Sequential audio player for binary audio chunks received from server
    const playNextAudioInQueue = useCallback(() => {
        if (audioQueueRef.current.length === 0) {
            isPlayingAudioRef.current = false;
            if (isTurnCompleteRef.current) {
                finishAiTurn();
            }
            return;
        }

        const nextBlob = audioQueueRef.current.shift()!;
        isPlayingAudioRef.current = true;
        setIsAiSpeaking(true);
        isAiSpeakingRef.current = true;
        setIsProcessing(false);
        isProcessingRef.current = false;

        // Ensure recognition is aborted / muted while AI audio is playing
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) { }
            recognitionRef.current = null;
        }

        // Clean up previous URL
        if (currentAudioUrlRef.current) {
            URL.revokeObjectURL(currentAudioUrlRef.current);
            currentAudioUrlRef.current = null;
        }

        const audioUrl = URL.createObjectURL(nextBlob);
        currentAudioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        const onDone = () => {
            if (currentAudioRef.current === audio) {
                currentAudioRef.current = null;
            }
            if (currentAudioUrlRef.current === audioUrl) {
                URL.revokeObjectURL(audioUrl);
                currentAudioUrlRef.current = null;
            }
            playNextAudioInQueue();
        };

        audio.onended = onDone;
        audio.onerror = (err) => {
            console.warn('[VoiceChat] Audio playback error:', err);
            onDone();
        };

        audio.play().catch((err) => {
            console.warn('[VoiceChat] Audio play failed:', err);
            onDone();
        });
    }, [finishAiTurn]);

    const muteAndSendUserSpeech = useCallback((sentence: string) => {
        const finalSentence = sentence.trim();
        if (!finalSentence) return;

        clearSilenceTimer();
        accumulatedTranscriptRef.current = '';
        baseTranscriptRef.current = '';

        console.log(`[VoiceChat] User sentence finalized after 3s pause. Sent to server: "${finalSentence}" (Muting microphone)`);
        setUserTranscript(finalSentence);
        setVoiceError(null);
        consecutiveNetworkErrorsRef.current = 0;

        setIsProcessing(true);
        isProcessingRef.current = true;
        isTurnCompleteRef.current = false;
        audioQueueRef.current = [];
        isPlayingAudioRef.current = false;

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

        // Safety watchdog: if server drops or hangs, automatically unmute after 25s
        clearWatchdog();
        watchdogTimeoutRef.current = setTimeout(() => {
            console.warn('[VoiceChat] Watchdog timeout: auto-unmuting microphone after processing inactivity');
            audioQueueRef.current = [];
            isPlayingAudioRef.current = false;
            isTurnCompleteRef.current = true;
            setIsAiSpeaking(false);
            isAiSpeakingRef.current = false;
            setIsProcessing(false);
            isProcessingRef.current = false;
            if (isCallActiveRef.current) {
                startListeningRef.current();
            }
        }, 25000);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'USER_SPEECH',
                sentence: finalSentence,
                text: finalSentence,
            }));
        }
    }, [clearWatchdog, clearSilenceTimer]);

    // Helper to start/resume speech recognition when active and unmuted
    const startListening = useCallback(() => {
        if (!isCallActiveRef.current || isAiSpeakingRef.current || isProcessingRef.current) {
            console.log('[VoiceChat] startListening skipped (active:', isCallActiveRef.current, 'aiSpeaking:', isAiSpeakingRef.current, 'processing:', isProcessingRef.current, ')');
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
            // continuous: true prevents cutting off mid-sentence on short natural pauses
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                console.log('[VoiceChat] Speech recognition listening started (continuous: true, 3s pause detection active)');
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
                let sessionFinal = '';
                let sessionInterim = '';

                for (let i = 0; i < event.results.length; i++) {
                    const res = event.results[i];
                    const transcript = res[0]?.transcript || '';
                    if (res.isFinal) {
                        sessionFinal += transcript + ' ';
                    } else {
                        sessionInterim += transcript;
                    }
                }

                const currentSessionText = (sessionFinal + sessionInterim).trim();
                const fullText = (baseTranscriptRef.current ? baseTranscriptRef.current + ' ' : '') + currentSessionText;
                const trimmedFullText = fullText.trim();

                if (trimmedFullText) {
                    accumulatedTranscriptRef.current = trimmedFullText;
                    setUserTranscript(trimmedFullText);
                    setVoiceError(null);
                    consecutiveNetworkErrorsRef.current = 0;

                    // User is actively speaking: clear any prior silence timer
                    clearSilenceTimer();

                    // Only send when there has been NO speech for at least 3 seconds (3000ms pause)
                    silenceTimerRef.current = setTimeout(() => {
                        const candidate = accumulatedTranscriptRef.current.trim();
                        if (candidate && !isProcessingRef.current && !isAiSpeakingRef.current) {
                            console.log(`[VoiceChat] 3-second silence detected. Finalizing user sentence: "${candidate}"`);
                            muteAndSendUserSpeech(candidate);
                        }
                    }, 3000);
                }
            };

            recognition.onerror = async (err: any) => {
                const errorType = err?.error;
                console.warn('[VoiceChat] Speech recognition notice:', errorType);

                if (errorType === 'no-speech') {
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
                // If there was accumulated text, preserve it as base transcript in case session ended
                if (accumulatedTranscriptRef.current) {
                    baseTranscriptRef.current = accumulatedTranscriptRef.current;
                }

                // Only restart if call is active and mic is not muted for AI speech or server processing
                if (isCallActiveRef.current && !isAiSpeakingRef.current && !isProcessingRef.current) {
                    if (consecutiveNetworkErrorsRef.current >= 3) {
                        console.warn('[VoiceChat] Auto-restart paused due to persistent network errors. Click Retry to reconnect.');
                        return;
                    }

                    const delay = consecutiveNetworkErrorsRef.current > 0 ? 1500 : 120;
                    restartListeningTimeoutRef.current = setTimeout(() => {
                        startListeningRef.current();
                    }, delay);
                }
            };

            recognition.start();
            recognitionRef.current = recognition;
        } catch (error) {
            console.warn('[VoiceChat] Recognition start error:', error);
            if (isCallActiveRef.current && !isAiSpeakingRef.current && !isProcessingRef.current) {
                restartListeningTimeoutRef.current = setTimeout(() => {
                    startListeningRef.current();
                }, 500);
            }
        }
    }, [stopAllSpeech, isBraveBrowser, muteAndSendUserSpeech, clearSilenceTimer]);

    // Keep ref updated to avoid stale closures in callbacks
    useEffect(() => {
        startListeningRef.current = startListening;
    }, [startListening]);

    const connectWebSocket = useCallback((voiceId?: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        const fullWsUrl = buildWsUrl(wsUrl, voiceId);
        const ws = new WebSocket(fullWsUrl);
        ws.binaryType = 'arraybuffer';

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
            // Direct audio received from server
            if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
                const audioBlob = event.data instanceof Blob
                    ? event.data
                    : new Blob([event.data], { type: 'audio/mp3' });

                console.log(`[VoiceChat] AI audio received directly (${audioBlob.size} bytes)`);

                setIsProcessing(false);
                isProcessingRef.current = false;
                clearWatchdog();

                audioQueueRef.current.push(audioBlob);

                if (!isPlayingAudioRef.current) {
                    playNextAudioInQueue();
                }
                return;
            }

            if (typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'AI_PROCESSING_START') {
                        console.log('[VoiceChat] AI processing started on server');
                        setIsProcessing(true);
                        isProcessingRef.current = true;
                        isTurnCompleteRef.current = false;
                        if (recognitionRef.current) {
                            try { recognitionRef.current.abort(); } catch (e) { }
                            recognitionRef.current = null;
                        }
                    } else if (data.type === 'AI_TURN_COMPLETE') {
                        console.log('[VoiceChat] AI turn complete received from server');
                        isTurnCompleteRef.current = true;

                        // If nothing is playing and audio queue is empty, finish turn immediately
                        if (!isPlayingAudioRef.current && audioQueueRef.current.length === 0) {
                            finishAiTurn();
                        }
                    }
                } catch {
                    console.log('[VoiceChat] Non-JSON message received:', event.data);
                }
            }
        };

        wsRef.current = ws;
        return ws;
    }, [wsUrl, buildWsUrl, playNextAudioInQueue, finishAiTurn, clearWatchdog]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            clearWatchdog();
            stopAllSpeech();
        };
    }, [connectWebSocket, clearWatchdog, stopAllSpeech]);

    // Start Call
    const startCall = useCallback(async () => {
        try {
            setVoiceError(null);
            consecutiveNetworkErrorsRef.current = 0;

            // Unlock browser audio playback policy on user click
            try {
                const unlockAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
                unlockAudio.play().catch(() => {});
            } catch (e) { }

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

            clearSilenceTimer();
            accumulatedTranscriptRef.current = '';
            baseTranscriptRef.current = '';
            setIsCallActive(true);
            isCallActiveRef.current = true;
            setIsProcessing(false);
            isProcessingRef.current = false;
            setIsAiSpeaking(false);
            isAiSpeakingRef.current = false;
            startListening();
        } catch (error: any) {
            console.error('[VoiceChat] Failed to start call:', error);
            setVoiceError(`Failed to start call: ${error?.message || error}`);
        }
    }, [connectWebSocket, startListening, clearSilenceTimer]);

    const endCall = useCallback(() => {
        setIsCallActive(false);
        isCallActiveRef.current = false;
        clearSilenceTimer();
        accumulatedTranscriptRef.current = '';
        baseTranscriptRef.current = '';
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
    }, [stopAllSpeech, clearSilenceTimer]);

    const retryListening = useCallback(() => {
        consecutiveNetworkErrorsRef.current = 0;
        setVoiceError(null);
        clearSilenceTimer();
        accumulatedTranscriptRef.current = '';
        baseTranscriptRef.current = '';
        setIsProcessing(false);
        isProcessingRef.current = false;
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        if (isCallActiveRef.current) {
            startListening();
        } else {
            startCall();
        }
    }, [startListening, startCall, clearSilenceTimer]);

    const interrupt = useCallback(() => {
        console.log('[VoiceChat] Interrupt requested by user');
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'INTERRUPT' }));
        }
        stopAllSpeech();
        if (isCallActiveRef.current) {
            setTimeout(() => {
                if (isCallActiveRef.current && !isAiSpeakingRef.current && !isProcessingRef.current) {
                    startListeningRef.current();
                }
            }, 300);
        }
    }, [stopAllSpeech]);

    return {
        isConnected,
        isCallActive,
        isAiSpeaking,
        isProcessing,
        isMicMuted: !isCallActive || isProcessing || isAiSpeaking,
        availableVoices,
        selectedVoiceId,
        setSelectedVoiceId,
        audioSettings,
        voiceError,
        userTranscript,
        aiTranscript,
        startCall,
        endCall,
        interrupt,
        retryListening,
        clearVoiceError: () => setVoiceError(null),
    };
}