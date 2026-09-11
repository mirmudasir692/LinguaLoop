import { useState, useRef, useEffect, useCallback } from 'react';
import { MicVAD } from '@ricky0123/vad-web';
import * as ort from 'onnxruntime-web';
import { downsampleBuffer, floatTo16BitPCM, int16ToFloat32 } from '../utils/audio';
import api from '../utils/api';

// Configure ONNX Runtime environment globally at module evaluation
ort.env.wasm.wasmPaths = '/';
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = false;
(ort.env.wasm as any).proxy = false;

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

    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const vadRef = useRef<MicVAD | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const muteGainRef = useRef<GainNode | null>(null);

    const wsRef = useRef<WebSocket | null>(null);

    const nextPlayTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    const audioSettingsRef = useRef<AudioSettings | null>(audioSettings);
    const selectedVoiceIdRef = useRef<string>(selectedVoiceId);
    const isAiSpeakingRef = useRef<boolean>(isAiSpeaking);
    const conversationIdRef = useRef<string | undefined>(options?.conversationId);
    const userIdRef = useRef<string | undefined>(options?.userId);

    useEffect(() => {
        audioSettingsRef.current = audioSettings;
    }, [audioSettings]);

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

    // 1. Fetch available voices & settings on initialization
    useEffect(() => {
        let isMounted = true;

        async function fetchMetadata() {
            // Fetch Voices
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
                console.error('Failed to fetch voices:', error);
            }

            // Fetch Settings
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
                console.error('Failed to fetch voice settings:', error);
            }
        }

        fetchMetadata();

        return () => {
            isMounted = false;
        };
    }, []);

    // Helper to build WebSocket URL with query parameters
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

    const playAudioChunk = useCallback((arrayBuffer: ArrayBuffer) => {
        if (!audioContextRef.current) return;
        setIsAiSpeaking(true);
        isAiSpeakingRef.current = true;

        const int16Data = new Int16Array(arrayBuffer);
        const float32Data = int16ToFloat32(int16Data);

        const targetSampleRate = audioSettingsRef.current?.targetSampleRate || 16000;
        const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, targetSampleRate);
        audioBuffer.getChannelData(0).set(float32Data);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        const currentTime = audioContextRef.current.currentTime;
        const startTime = Math.max(currentTime, nextPlayTimeRef.current);

        source.start(startTime);
        nextPlayTimeRef.current = startTime + audioBuffer.duration;

        activeSourcesRef.current.push(source);

        source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
            if (activeSourcesRef.current.length === 0) {
                setIsAiSpeaking(false);
                isAiSpeakingRef.current = false;
            }
        };
    }, []);

    const stopAllAudio = useCallback(() => {
        activeSourcesRef.current.forEach(source => {
            try { source.stop(); } catch (e) { /* Ignore if already stopped */ }
        });
        activeSourcesRef.current = [];
        nextPlayTimeRef.current = 0;
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
    }, []);

    // Connect WebSocket
    const connectWebSocket = useCallback((voiceId?: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        const fullWsUrl = buildWsUrl(wsUrl, voiceId);

        const ws = new WebSocket(fullWsUrl);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        ws.onerror = (err) => console.error('WebSocket error:', err);

        ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                console.log(`🔊 [VoiceChat] Received audio chunk from server (${event.data.byteLength} bytes)`);
                playAudioChunk(event.data);
            }
        };

        wsRef.current = ws;
        return ws;
    }, [wsUrl, buildWsUrl, playAudioChunk]);

    // 2. Manage WebSocket Connection Lifecycle
    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connectWebSocket]);

    // 3. Start Call Handler
    const startCall = useCallback(async () => {
        try {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                connectWebSocket();
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            streamRef.current = stream;

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            // Configure ONNX Runtime environment locally before MicVAD initialization
            ort.env.wasm.wasmPaths = '/';
            (ort.env.wasm as any).proxy = false;

            // Initialize MicVAD (Silero VAD) to detect when user starts talking and stops talking
            try {
                vadRef.current = await MicVAD.new({
                    baseAssetPath: '/',
                    onnxWASMBasePath: '/',
                    ortConfig(ortConfigInstance: any) {
                        ortConfigInstance.env.wasm.wasmPaths = '/';
                        if (ortConfigInstance.env.wasm) {
                            (ortConfigInstance.env.wasm as any).proxy = false;
                        }
                    },
                    getStream: async () => stream,
                    onSpeechStart: () => {
                        console.log('🗣️ [VoiceChat] Speech started...');
                        if (isAiSpeakingRef.current) {
                            console.log('🛑 Barge-in detected! Sending INTERRUPT...');
                            wsRef.current?.send(JSON.stringify({ type: 'INTERRUPT' }));
                            stopAllAudio();
                        }
                    },
                    onSpeechEnd: (audio: Float32Array) => {
                        console.log(`🎙️ [VoiceChat] Speech ended (gap detected). Spoken utterance: ${audio.length} samples (${(audio.length / 16000).toFixed(2)}s)`);
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                            const pcmData = floatTo16BitPCM(audio);
                            console.log(`🎤 [VoiceChat] Sending spoken sentence audio (${pcmData.byteLength} bytes) to server...`);
                            wsRef.current.send(pcmData.buffer as ArrayBuffer);
                        }
                    },
                    positiveSpeechThreshold: 0.8,
                    negativeSpeechThreshold: 0.65,
                    redemptionMs: 400, // 400ms pause/gap after sentence before triggering onSpeechEnd
                    preSpeechPadMs: 300, // Prepend 300ms before speech so first syllable is never cut off
                    minSpeechMs: 250,
                });
                console.log('✅ Voice Activity Detection (Silero VAD) initialized successfully');
            } catch (vadError) {
                console.warn('Voice Activity Detection unavailable, proceeding with speech-gap fallback detector:', vadError);
            }

            const source = audioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            // Fallback speech-gap detector if MicVAD was unavailable:
            // Buffers spoken audio and only transmits when a silence gap (>600ms) occurs after speaking
            let isSpeakingFallback = false;
            let silenceStartFallback = 0;
            let fallbackBuffer: Float32Array[] = [];
            const SILENCE_GAP_MS = 600;
            const SPEECH_ENERGY_THRESHOLD = 0.015;

            processor.onaudioprocess = (e) => {
                if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                // When MicVAD is active, it handles speech detection and sends via onSpeechEnd
                if (vadRef.current) return;

                const input = e.inputBuffer.getChannelData(0);

                let sum = 0;
                for (let i = 0; i < input.length; i++) {
                    sum += input[i] * input[i];
                }
                const rms = Math.sqrt(sum / input.length);
                const now = Date.now();

                if (rms > SPEECH_ENERGY_THRESHOLD) {
                    if (!isSpeakingFallback) {
                        isSpeakingFallback = true;
                        console.log('🗣️ [VoiceChat-Fallback] Speech started...');
                        if (isAiSpeakingRef.current) {
                            wsRef.current.send(JSON.stringify({ type: 'INTERRUPT' }));
                            stopAllAudio();
                        }
                    }
                    silenceStartFallback = 0;
                    fallbackBuffer.push(new Float32Array(input));
                } else if (isSpeakingFallback) {
                    fallbackBuffer.push(new Float32Array(input));
                    if (silenceStartFallback === 0) {
                        silenceStartFallback = now;
                    } else if (now - silenceStartFallback > SILENCE_GAP_MS) {
                        isSpeakingFallback = false;
                        silenceStartFallback = 0;

                        const totalLength = fallbackBuffer.reduce((acc, b) => acc + b.length, 0);
                        const merged = new Float32Array(totalLength);
                        let offset = 0;
                        for (const b of fallbackBuffer) {
                            merged.set(b, offset);
                            offset += b.length;
                        }
                        fallbackBuffer = [];

                        const hardwareSampleRate = audioContextRef.current!.sampleRate;
                        const targetSampleRate = audioSettingsRef.current?.targetSampleRate || 16000;
                        const downsampled = downsampleBuffer(merged, hardwareSampleRate, targetSampleRate);
                        const pcmData = floatTo16BitPCM(downsampled);

                        console.log(`🎙️ [VoiceChat-Fallback] Speech ended (gap detected). Sending spoken sentence (${pcmData.byteLength} bytes) to server...`);
                        wsRef.current.send(pcmData.buffer as ArrayBuffer);
                    }
                }
            };

            const muteGain = audioContextRef.current.createGain();
            muteGain.gain.value = 0;
            muteGainRef.current = muteGain;

            source.connect(processor);
            processor.connect(muteGain);
            muteGain.connect(audioContextRef.current.destination);

            setIsCallActive(true);
        } catch (error: any) {
            console.error('Failed to start call:', error);
            if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
                alert('Microphone access denied. Please allow microphone permissions in your browser.');
            } else {
                alert(`Failed to start call: ${error?.message || error}`);
            }
        }
    }, [connectWebSocket, stopAllAudio]);

    const endCall = useCallback(() => {
        setIsCallActive(false);
        stopAllAudio();

        vadRef.current?.destroy();
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        muteGainRef.current?.disconnect();
        streamRef.current?.getTracks().forEach(track => track.stop());
        audioContextRef.current?.close();

        vadRef.current = null;
        processorRef.current = null;
        sourceRef.current = null;
        muteGainRef.current = null;
        streamRef.current = null;
        audioContextRef.current = null;
    }, [stopAllAudio]);

    return {
        isConnected,
        isCallActive,
        isAiSpeaking,
        availableVoices,
        selectedVoiceId,
        setSelectedVoiceId,
        audioSettings,
        startCall,
        endCall
    };
}