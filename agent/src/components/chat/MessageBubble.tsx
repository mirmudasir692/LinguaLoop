import { cn } from "../../lib/utils";
import { ChatMessage } from "../../services/chatService";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  let thinkingContent = '';
  let mainContent = message.content;

  // Parse <thinking> block if it exists in the assistant's message
  if (!isUser && message.content) {
    const thinkingMatch = message.content.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (thinkingMatch) {
      thinkingContent = thinkingMatch[1].trim();
      mainContent = message.content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
    }
  }

  // Show "Thinking..." if streaming has started but no content has arrived yet
  const isThinking = isStreaming && !message.content && !thinkingContent;

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-800 border border-gray-200'
        )}
      >
        {/* 1. Animated Thinking Indicator (Collapses when text arrives) */}
        {isThinking ? (
          <div className="flex items-center space-x-2 text-gray-500 italic">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            <span className="ml-2 text-sm">Thinking...</span>
          </div>
        ) : (
          <>
            {/* 2. Collapsible Thinking Block (If model outputs <thinking> tags) */}
            {thinkingContent && (
              <details className="mb-3 border border-gray-300 rounded-md bg-gray-50" open>
                <summary className="px-3 py-1.5 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 select-none flex items-center">
                  <svg className="w-4 h-4 mr-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Thinking process
                </summary>
                <div className="px-3 pb-3 text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-200 pt-2">
                  {thinkingContent}
                </div>
              </details>
            )}

            {/* 3. Main Message Content */}
            <div className="whitespace-pre-wrap">
              {mainContent || (isStreaming ? <span className="inline-block w-2 h-4 bg-gray-800 animate-pulse rounded-sm"></span> : '')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}