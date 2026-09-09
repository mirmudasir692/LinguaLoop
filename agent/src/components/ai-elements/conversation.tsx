import * as React from 'react';

export function Conversation({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col ${className}`}>{children}</div>;
}
export function ConversationContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex-1 overflow-y-auto space-y-4 p-4 ${className}`}>{children}</div>;
}
export function ConversationScrollButton() {
  return (
    <button className="fixed bottom-24 right-8 rounded-full bg-blue-500 p-2 text-white shadow-lg hover:bg-blue-600">
      ↓
    </button>
  );
}