import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Globe, X, Send, Sparkles } from 'lucide-react';

// ==========================================
// Native Web Speech API TypeScript Types
// ==========================================
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ==========================================
// Component Props
// ==========================================
export interface VoiceTutorProps {
  onTranscriptChange?: (transcript: string, isFinal: boolean) => void;
  onSendMessage?: (text: string) => Promise<void> | void;
  isAiSpeaking?: boolean;
  language?: string;
  onClose?: () => void;
  className?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'fr-FR', label: 'French (France)' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'hi-IN', label: 'Hindi' },
];

export function VoiceTutor({
  onTranscriptChange,
  onSendMessage,
  isAiSpeaking = false,
  language = 'en-US',
  onClose,
  className = '',
}: VoiceTutorProps) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language);
  const [error, setError] = useState<string | null>(null);

  // useRef to hold the native SpeechRecognition instance
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Tracking flags in refs to prevent closure staleness in event callbacks
  const isListeningRef = useRef<boolean>(false);
  const isTtsSpeakingRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync ref with external isAiSpeaking prop
  useEffect(() => {
    isTtsSpeakingRef.current = isAiSpeaking;
    setIsTtsSpeaking(isAiSpeaking);

    if (isAiSpeaking) {
      // Pause recognition immediately when AI / TTS starts speaking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          console.warn('Error pausing recognition on external TTS start:', err);
        }
      }
    } else {
      // Resume recognition when AI / TTS finishes speaking
      if (isListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (err) {
          console.warn('Error resuming recognition on external TTS end:', err);
        }
      }
    }
  }, [isAiSpeaking]);

  // Native TTS function using window.speechSynthesis
  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window) || !text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage;

    // Pause recognition when TTS begins speaking
    utterance.onstart = () => {
      isTtsSpeakingRef.current = true;
      setIsTtsSpeaking(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          console.warn('Failed to pause recognition for TTS:', err);
        }
      }
    };

    const handleSpeechEnd = () => {
      isTtsSpeakingRef.current = false;
      setIsTtsSpeaking(false);
      // Resume recognition when TTS finishes
      if (isListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (err) {
          console.warn('Failed to resume recognition after TTS:', err);
        }
      }
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = (err) => {
      console.warn('Speech synthesis error:', err);
      handleSpeechEnd();
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedLanguage]);

  // Initialize SpeechRecognition instance using useEffect
  useEffect(() => {
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setIsSupported(false);
      setError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const speechText = result[0]?.transcript || '';
        if (result.isFinal) {
          finalStr += speechText;
        } else {
          interimStr += speechText;
        }
      }

      if (finalStr) {
        setTranscript((prev) => {
          const updated = prev ? `${prev} ${finalStr}` : finalStr;
          onTranscriptChange?.(updated, true);
          return updated;
        });
        setInterimTranscript('');
      } else {
        setInterimTranscript(interimStr);
        onTranscriptChange?.(interimStr, false);
      }
    };

    // Robust auto-restart logic inside onerror so it doesn't stop on silence
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('SpeechRecognition error:', event.error, event.message);

      // 'no-speech' happens on silence: ignore and let auto-restart handle it
      if (event.error === 'no-speech') {
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
        isListeningRef.current = false;
        setIsListening(false);
        return;
      }

      // Other recoverable errors like network: let onend auto-restart
    };

    // Robust auto-restart logic inside onend so it doesn't stop listening on silence
    recognition.onend = () => {
      setIsListening(false);

      if (isListeningRef.current && !isTtsSpeakingRef.current) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current && !isTtsSpeakingRef.current) {
            try {
              recognition.start();
              setIsListening(true);
            } catch (err) {
              console.warn('SpeechRecognition auto-restart retry:', err);
            }
          }
        }, 150);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      isListeningRef.current = false;
      try {
        recognition.abort();
      } catch (err) {}
      recognitionRef.current = null;
    };
  }, [selectedLanguage, onTranscriptChange]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Failed to stop recognition:', err);
      }
    } else {
      setError(null);
      isListeningRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        if (err?.name === 'InvalidStateError') {
          setIsListening(true);
        } else {
          console.error('Failed to start recognition:', err);
          setError('Failed to start microphone. Please check permissions.');
        }
      }
    }
  }, [isListening]);

  const handleSend = () => {
    const textToSend = (transcript + ' ' + interimTranscript).trim();
    if (!textToSend) return;
    onSendMessage?.(textToSend);
    setTranscript('');
    setInterimTranscript('');
  };

  const handleClear = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-blue-100 shadow-xl overflow-hidden max-w-lg w-full transition-all ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-white/15 backdrop-blur-xs rounded-xl">
            <Sparkles className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Voice AI Tutor</h3>
            <p className="text-xs text-blue-100">Native Browser Speech & Audio</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Badge */}
          <div className="flex items-center space-x-1.5 bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                isTtsSpeaking
                  ? 'bg-amber-400 animate-bounce'
                  : isListening
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-gray-400'
              }`}
            />
            <span>
              {isTtsSpeaking
                ? 'Tutor Speaking'
                : isListening
                ? 'Listening...'
                : 'Ready'}
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
              title="Close Voice Tutor"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Browser compatibility alert */}
        {!isSupported && (
          <div className="flex items-start space-x-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Speech Recognition Unsupported</p>
              <p>
                Your browser does not support the native Web Speech API. Please use{' '}
                <span className="font-medium">Google Chrome</span>,{' '}
                <span className="font-medium">Microsoft Edge</span>, or{' '}
                <span className="font-medium">Safari</span>.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Language selector */}
        <div className="flex items-center justify-between text-xs bg-gray-50 border border-gray-100 rounded-xl p-2.5">
          <div className="flex items-center space-x-1.5 text-gray-600 font-medium">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>Language:</span>
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isListening}
            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 cursor-pointer text-xs"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Audio / Mic Wave Visualizer */}
        <div className="h-16 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-blue-100/60 flex items-center justify-center p-3">
          {isTtsSpeaking ? (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-amber-700 font-semibold flex items-center gap-1.5 mr-2">
                <Volume2 className="w-4 h-4 animate-pulse text-amber-600" />
                Tutor Speaking:
              </span>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-amber-500 rounded-full animate-bounce"
                  style={{
                    height: `${12 + (i % 3) * 10}px`,
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              ))}
            </div>
          ) : isListening ? (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-blue-600 font-semibold flex items-center gap-1.5 mr-2">
                <Mic className="w-4 h-4 animate-pulse text-blue-600" />
                Listening continuously:
              </span>
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-blue-500 rounded-full animate-pulse"
                  style={{
                    height: `${8 + ((i * 4) % 18)}px`,
                    animationDuration: `${0.6 + (i % 3) * 0.2}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 font-medium text-center">
              Microphone paused. Click "Start Listening" to begin voice practice.
            </p>
          )}
        </div>

        {/* Live Transcription Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 min-h-[90px] max-h-36 overflow-y-auto flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">
              Speech Transcript
            </span>
            {transcript || interimTranscript ? (
              <p className="text-sm text-gray-800 leading-relaxed font-normal">
                {transcript}{' '}
                {interimTranscript && (
                  <span className="text-blue-500 italic opacity-80">{interimTranscript}</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">
                {isListening
                  ? 'Start speaking into your microphone…'
                  : 'Your spoken words will appear here in real-time…'}
              </p>
            )}
          </div>

          {(transcript || interimTranscript) && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleClear}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear text
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-1 gap-3">
          <button
            onClick={toggleListening}
            disabled={!isSupported}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Start Listening</span>
              </>
            )}
          </button>

          {onSendMessage && (
            <button
              onClick={handleSend}
              disabled={!(transcript || interimTranscript).trim()}
              className="flex items-center space-x-1.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Send spoken message to Tutor"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          )}

          {/* Quick Demo TTS Test Button */}
          <button
            onClick={() => speakText("Hello! I am your AI language tutor. How can I help you practice today?")}
            disabled={isTtsSpeaking}
            title="Test TTS Pronunciation"
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all active:scale-95 disabled:opacity-40"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoiceTutor;
